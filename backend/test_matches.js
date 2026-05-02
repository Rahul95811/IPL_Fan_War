const { buildFixturePayloadFromHtml } = require('./utils/iplFixturesEmbed');
const fs = require('fs');

async function test() {
  try {
    const html = fs.readFileSync('fixtures_actual.html', 'utf8');
    const payload = buildFixturePayloadFromHtml(html);
    
    if (!payload) {
      console.log("No IPL matches found in the provided HTML.");
      return;
    }

    console.log("--- TOP MATCH ---");
    console.log(`Title: ${payload.topMatch.title}`);
    console.log(`Status: ${payload.topMatch.statusDetail}`);
    console.log(`isLive: ${payload.topMatch.isLive}, isToday: ${payload.topMatch.isToday}, isTomorrow: ${payload.topMatch.isTomorrow}`);
    console.log(`Rank: ${payload.topMatch.rank} (Calculated manually for verification)`);
    
    console.log("\n--- UPCOMING MATCHES ---");
    payload.upcomingMatches.forEach((m, i) => {
      console.log(`${i+1}. ${m.title}`);
      console.log(`   Badge: ${m.uiListBadge}, isToday: ${m.isToday}, isTomorrow: ${m.isTomorrow}, Start: ${m.startDateEpochMs}`);
    });

  } catch (err) {
    console.error("Test failed:", err.message);
  }
}

test();
