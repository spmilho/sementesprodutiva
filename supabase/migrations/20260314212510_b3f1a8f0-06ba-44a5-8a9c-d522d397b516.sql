
UPDATE weather_records 
SET record_date = make_date(
  EXTRACT(YEAR FROM record_date)::int,
  EXTRACT(DAY FROM record_date)::int,
  EXTRACT(MONTH FROM record_date)::int
)
WHERE cycle_id = '8f2bc30d-6eee-41de-8fcc-10299e86c4de'
AND EXTRACT(DAY FROM record_date) = 3
AND EXTRACT(MONTH FROM record_date) != 3
AND deleted_at IS NULL;
