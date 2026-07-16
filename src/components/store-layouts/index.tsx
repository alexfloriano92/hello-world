import type { LayoutVariant } from "@/lib/store-design";
import { AuroraLayout } from "./aurora";
import { EditorialLayout } from "./editorial";
import { MonolithLayout } from "./monolith";
import { ShowroomLayout } from "./showroom";
import { NeoMarcheLayout } from "./neo-marche";
import { ConcourseLayout } from "./concourse";
import { DefaultLayout } from "./default";
import type { StoreLike, VehicleLike } from "./shared";

export function renderStoreLayout(variant: LayoutVariant, store: StoreLike, vehicles: VehicleLike[]) {
  switch (variant) {
    case "aurora":     return <AuroraLayout store={store} vehicles={vehicles} />;
    case "editorial":  return <EditorialLayout store={store} vehicles={vehicles} />;
    case "monolith":   return <MonolithLayout store={store} vehicles={vehicles} />;
    case "showroom":   return <ShowroomLayout store={store} vehicles={vehicles} />;
    case "neo-marche": return <NeoMarcheLayout store={store} vehicles={vehicles} />;
    case "concourse":  return <ConcourseLayout store={store} vehicles={vehicles} />;
    case "default":
    default:           return <DefaultLayout store={store} vehicles={vehicles} />;
  }
}

export type { StoreLike, VehicleLike } from "./shared";