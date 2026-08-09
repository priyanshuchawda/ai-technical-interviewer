import candidatesData from "../../candidates.json";

async function testInterviewApi() {
  const baseUrl = "http://localhost:3000/api/interview";
  const sessionId = "test-session-" + Date.now();
  const candidate = candidatesData.candidates[0];

  console.log("--- TEST 1: Initializing Interview ---");
  const res1 = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, candidate }),
  });
  const data1 = await res1.json();
  console.log("Start Response:", data1);

  if (!data1.reply || data1.done !== false) {
    console.error("FAILED Test 1");
    process.exit(1);
  }

  console.log("\n--- TEST 2: Conversation Turns (Turns 1 to 8) ---");
  for (let i = 1; i <= 8; i++) {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        message: `In mission ${i}, I designed a scalable pipeline using vector similarity search and optimized prompt templates to reduce latency.`,
      }),
    });
    const data = await res.json();
    console.log(`Turn ${i} Reply:`, data.reply);
    console.log(`Turn ${i} Done status:`, data.done);

    if (i < 8 && data.done !== false) {
      console.error(`FAILED Turn ${i}: Should not be done yet`);
      process.exit(1);
    }
    if (i === 8) {
      if (data.done !== true || !data.feedback) {
        console.error("FAILED Turn 8: Should be completed with feedback");
        process.exit(1);
      }
      console.log("\n--- FINAL FEEDBACK REPORT ---");
      console.log(JSON.stringify(data.feedback, null, 2));
    }
  }

  console.log("\n✅ ALL API TESTS PASSED SUCCESSFULLY!");
}

testInterviewApi().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
