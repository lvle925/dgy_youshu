import administrative from "../../src/mocks/china-districts.json";
import { REGION_CITY_OPTIONS } from "../../src/mocks/enums";

const divisions = administrative as Record<string, Record<string, string[]>>;
const short = (name: string) => name.replace(/(特别行政区|自治区|省|市)$/, "");

export function districtsFor(city: string): string[] {
  const province = divisions[city];
  if (province) {
    const names = Object.keys(province);
    return names.every(name => name === "市辖区" || name.includes("县级行政区划") || name === "县")
      ? Object.values(province).flat()
      : names.filter(name => name !== "市辖区");
  }
  for (const cities of Object.values(divisions)) {
    if (cities[city]) return cities[city].filter(name => name !== "市辖区");
  }
  return [];
}

export function regionMatches(region: string, city: string) {
  if (!city.trim()) return true;
  if (!region.trim()) return false;
  const regionText = region.trim();
  const cityText = city.trim();
  return regionText.includes(short(cityText)) || districtsFor(cityText).some(district => regionText === district || regionText.endsWith(district));
}

export function isShanghaiArea(city: string) {
  return city === "上海市" || REGION_CITY_OPTIONS["上海市"].includes(city);
}
