async function test() {
  try {
    const res = await fetch("http://117.217.120.58:8153/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@test.com", password: "password" })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", text);
  } catch(e) {
    console.error("Fetch error:", e.message);
  }
}
test();
