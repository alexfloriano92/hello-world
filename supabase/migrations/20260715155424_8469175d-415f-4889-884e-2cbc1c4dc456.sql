
CREATE OR REPLACE FUNCTION public.admin_list_audit(
  _entity text DEFAULT NULL,
  _action text DEFAULT NULL,
  _actor_id uuid DEFAULT NULL,
  _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL,
  _search text DEFAULT NULL,
  _limit int DEFAULT 25,
  _offset int DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _total bigint;
  _items jsonb;
  _lim int := LEAST(GREATEST(COALESCE(_limit, 25), 1), 200);
  _off int := GREATEST(COALESCE(_offset, 0), 0);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT COUNT(*) INTO _total FROM public.audit_logs a
  WHERE (_entity IS NULL OR a.entity = _entity)
    AND (_action IS NULL OR a.action = _action)
    AND (_actor_id IS NULL OR a.actor_id = _actor_id)
    AND (_from IS NULL OR a.created_at >= _from)
    AND (_to IS NULL OR a.created_at <= _to)
    AND (_search IS NULL OR a.summary ILIKE '%'||_search||'%' OR a.actor_name ILIKE '%'||_search||'%');

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb) INTO _items
  FROM (
    SELECT a.id, a.entity, a.action, a.actor_id, a.actor_name, a.summary,
           a.store_id, a.entity_id, a.changes, a.created_at
    FROM public.audit_logs a
    WHERE (_entity IS NULL OR a.entity = _entity)
      AND (_action IS NULL OR a.action = _action)
      AND (_actor_id IS NULL OR a.actor_id = _actor_id)
      AND (_from IS NULL OR a.created_at >= _from)
      AND (_to IS NULL OR a.created_at <= _to)
      AND (_search IS NULL OR a.summary ILIKE '%'||_search||'%' OR a.actor_name ILIKE '%'||_search||'%')
    ORDER BY a.created_at DESC
    LIMIT _lim OFFSET _off
  ) x;

  RETURN jsonb_build_object('total', _total, 'items', _items, 'limit', _lim, 'offset', _off);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_audit_filters()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN jsonb_build_object(
    'entities', (SELECT COALESCE(jsonb_agg(e ORDER BY e), '[]'::jsonb)
                 FROM (SELECT DISTINCT entity AS e FROM public.audit_logs) t),
    'actions',  (SELECT COALESCE(jsonb_agg(ac ORDER BY ac), '[]'::jsonb)
                 FROM (SELECT DISTINCT action AS ac FROM public.audit_logs) t),
    'actors',   (SELECT COALESCE(jsonb_agg(row_to_json(a) ORDER BY a.actor_name), '[]'::jsonb)
                 FROM (SELECT DISTINCT actor_id, COALESCE(actor_name, actor_id::text) AS actor_name
                       FROM public.audit_logs WHERE actor_id IS NOT NULL) a)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_audit(text, text, uuid, timestamptz, timestamptz, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_audit_filters() TO authenticated;
