-- Force PostgREST to reload its schema cache after column additions.
NOTIFY pgrst, 'reload schema';
