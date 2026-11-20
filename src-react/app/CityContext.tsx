import { createContext, useContext } from "react";

export const CityContext = createContext<{
  city: string;
  setCity: (city: string) => void;
}>({ city: "上海市", setCity: () => undefined });
export const useCurrentCity = () => useContext(CityContext);
