DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'devices'
            AND column_name = 'device_name'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'devices'
            AND column_name = 'device_id'
    ) THEN
        ALTER TABLE devices
        RENAME COLUMN device_name TO device_id;
    END IF;
END $$;
