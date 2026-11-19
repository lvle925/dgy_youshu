package com.youshu.local;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.*;

@RestController
@RequestMapping("/api")
@Tag(name = "业务数据", description = "本地演示数据集的查询与维护")
public class RecordsController {
    private static final Set<String> COLLECTIONS = Set.of("members", "campusList", "visitOrders", "visitRecords", "roles", "policies", "clues");
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public RecordsController(JdbcTemplate jdbc, ObjectMapper mapper) throws IOException {
        this.jdbc = jdbc;
        this.mapper = mapper;
        Map<String, List<Map<String, Object>>> seeds = mapper.readValue(new ClassPathResource("seed.json").getInputStream(), new TypeReference<>() {});
        for (String collection : COLLECTIONS) {
            if (jdbc.queryForObject("SELECT COUNT(*) FROM seed_state WHERE collection=?", Integer.class, collection) == 0) {
                for (Map<String, Object> row : seeds.getOrDefault(collection, List.of())) save(collection, String.valueOf(row.get("id")), row);
                jdbc.update("INSERT INTO seed_state(collection) VALUES(?)", collection);
            }
        }
    }
    private void check(String name) {
        if (!COLLECTIONS.contains(name)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "未知数据集");
    }
    private Map<String, Object> parse(String json) {
        try { return mapper.readValue(json, new TypeReference<>() {}); }
        catch (IOException ex) { throw new IllegalStateException(ex); }
    }
    private String encode(Map<String, Object> row) {
        try { return mapper.writeValueAsString(row); }
        catch (IOException ex) { throw new IllegalArgumentException(ex); }
    }
    private void save(String collection, String id, Map<String, Object> row) {
        jdbc.update("MERGE INTO records(collection,id,payload) KEY(collection,id) VALUES(?,?,?)", collection, id, encode(row));
    }
    @Operation(summary = "检查 API 服务")
    @GetMapping("/health") public Map<String, String> health() { return Map.of("status", "ok"); }
    @Operation(summary = "列出一个业务数据集的记录")
    @GetMapping("/records/{collection}") public List<Map<String, Object>> list(@PathVariable String collection) {
        check(collection);
        return jdbc.query("SELECT payload FROM records WHERE collection=? ORDER BY id", (rs, n) -> parse(rs.getString(1)), collection);
    }
    @Operation(summary = "新增业务记录")
    @PostMapping("/records/{collection}") @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> create(@PathVariable String collection, @RequestBody Map<String, Object> row) {
        check(collection);
        String id = UUID.randomUUID().toString();
        row.put("id", id);
        save(collection, id, row);
        return row;
    }
    @Operation(summary = "更新业务记录")
    @PutMapping("/records/{collection}/{id}")
    public Map<String, Object> update(@PathVariable String collection, @PathVariable String id, @RequestBody Map<String, Object> row) {
        check(collection);
        if (jdbc.queryForObject("SELECT COUNT(*) FROM records WHERE collection=? AND id=?", Integer.class, collection, id) == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "记录不存在");
        row.put("id", id);
        save(collection, id, row);
        return row;
    }
    @Operation(summary = "删除业务记录")
    @DeleteMapping("/records/{collection}/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String collection, @PathVariable String id) {
        check(collection);
        if (jdbc.update("DELETE FROM records WHERE collection=? AND id=?", collection, id) == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "记录不存在");
    }
    @Operation(summary = "完成走访工单并生成走访记录")
    @PostMapping("/visits/{id}/complete") @Transactional
    public Map<String, Object> complete(@PathVariable String id, @RequestBody Map<String, Object> input) {
        List<String> found = jdbc.query("SELECT payload FROM records WHERE collection='visitOrders' AND id=? FOR UPDATE", (rs, n) -> rs.getString(1), id);
        if (found.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "工单不存在");
        Map<String, Object> order = parse(found.get(0));
        if ("已完成".equals(order.get("status"))) throw new ResponseStatusException(HttpStatus.CONFLICT, "工单已完成");
        String result = String.valueOf(input.getOrDefault("result", "")).trim();
        if (result.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请填写走访结果");
        order.put("status", "已完成");
        save("visitOrders", id, order);
        Map<String, Object> record = new LinkedHashMap<>();
        record.put("id", UUID.randomUUID().toString()); record.put("orderId", id);
        record.put("title", order.getOrDefault("title", "")); record.put("company", order.getOrDefault("company", ""));
        record.put("owner", order.getOrDefault("owner", "")); record.put("date", java.time.LocalDate.now().toString());
        record.put("result", result); record.put("duration", input.getOrDefault("duration", ""));
        save("visitRecords", String.valueOf(record.get("id")), record);
        return Map.of("order", order, "record", record);
    }
}
