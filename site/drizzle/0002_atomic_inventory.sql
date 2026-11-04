CREATE TRIGGER chef_event_check BEFORE INSERT ON chef_events
BEGIN
 SELECT CASE WHEN COALESCE((SELECT revision FROM chef_lots WHERE owner=NEW.owner AND id=NEW.lot_id),0) != NEW.base_revision THEN RAISE(ABORT,'CHEF_CONFLICT') END;
END;
--> statement-breakpoint
CREATE TRIGGER chef_event_apply AFTER INSERT ON chef_events
BEGIN
 INSERT INTO chef_lots(owner,id,data,revision) VALUES(NEW.owner,NEW.lot_id,NEW.after_json,NEW.base_revision+1)
 ON CONFLICT(owner,id) DO UPDATE SET data=excluded.data,revision=excluded.revision;
END;
