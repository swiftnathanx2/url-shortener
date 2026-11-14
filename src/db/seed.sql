INSERT INTO links(code, target_url, expires_at) VALUES 
('docs123','https://expressjs.com', NULL),
('gh-node', 'https://github.com/nodejs/node', NULL),
('oldlink', 'https://example.com/old', NOW() - INTERVAL '1 day')
ON CONFLICT (code) DO NOTHING;

INSERT INTO clicks (link_id, clicked_at, referrer, user_agent)
SELECT l.id ,
    NOW() - g *  INTERVAL '1 hour',
    'https://news.ycombinator.com',
    'Mozilla/5.0 (seed)'

FROM (VALUES ('docs123',5), ('gh-node', 3)) AS s(code, n)
JOIN links l ON l.code = s.code
CROSS JOIN LATERAL generate_series(1, s.n) AS g
WHERE NOT EXISTS (SELECT 1 FROM clicks c WHERE c.link_id = l.id);

UPDATE links
SET click_count = (SELECT count(*) FROM clicks WHERE clicks.link_id = links.id)
WHERE code IN ('docs123', 'gh-node', 'oldlink');