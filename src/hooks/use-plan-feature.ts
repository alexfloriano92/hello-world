import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { checkFeatures, myPlan, type Feature } from "@/lib/features.functions";

export function usePlanFeature(feature: Feature) {
  const fn = useServerFn(checkFeatures);
  const q = useQuery({
    queryKey: ["plan-feature", feature],
    queryFn: () => fn({ data: { features: [feature] } }),
    staleTime: 60_000,
  });
  return { enabled: !!q.data?.[feature], loading: q.isLoading };
}

export function useMyPlan() {
  const fn = useServerFn(myPlan);
  return useQuery({ queryKey: ["my-plan"], queryFn: () => fn(), staleTime: 60_000 });
}
