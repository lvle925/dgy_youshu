package com.youshu.local;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(info = @Info(
        title = "有数计划本地 API",
        version = "1.0.0",
        description = "供本机开发与演示使用的有数计划业务接口。业务接口需要先通过本地管理员会话认证。"
))
public class OpenApiConfig {
}
