const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\admin\\.gemini\\antigravity\\brain\\d3478cdc-363b-498d-be73-996dbfa02639";
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots");
const LOCAL_DIR = path.join(__dirname, "..", "screenshots");

[SCREENSHOT_DIR, LOCAL_DIR].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

async function run() {
  console.log("🚀 Starting screenshot capture...");

  // 1. Get session cookie by logging in as Owner
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "owner@magicaltarot.com",
      password: "Password123!",
    }),
  });

  const cookieHeader = loginRes.headers.get("set-cookie") || "";
  const tokenMatch = cookieHeader.match(/tarot_admin_session=([^;]+)/);
  const sessionToken = tokenMatch ? tokenMatch[1] : "";
  console.log("🔑 Authenticated as Owner");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();

  // Set session cookie
  if (sessionToken) {
    await page.setCookie({
      name: "tarot_admin_session",
      value: sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
    });
  }

  const capture = async (name, url, isMobile = false, width = 1440, height = 900) => {
    console.log(`📸 Capturing ${name}...`);
    if (isMobile) {
      await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    } else {
      await page.setViewport({ width, height, isMobile: false, deviceScaleFactor: 2 });
    }

    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    // Small delay to ensure all animations and fonts settle
    await new Promise((r) => setTimeout(r, 1200));

    const artifactPath = path.join(SCREENSHOT_DIR, `${name}.png`);
    const localPath = path.join(LOCAL_DIR, `${name}.png`);

    await page.screenshot({ path: artifactPath, fullPage: false });
    fs.copyFileSync(artifactPath, localPath);
    console.log(`✅ Saved: ${name}.png`);
  };

  // 1. Login Page Desktop
  // Clear cookies for login page preview
  await page.deleteCookie({ name: "tarot_admin_session", domain: "localhost" });
  await capture("01_login_desktop", "http://localhost:3000/login", false, 1440, 900);

  // Restore cookie
  if (sessionToken) {
    await page.setCookie({
      name: "tarot_admin_session",
      value: sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
    });
  }

  // 2. Dashboard Desktop
  await capture("02_dashboard_desktop", "http://localhost:3000/admin/dashboard", false, 1440, 900);

  // 3. Queues List Desktop
  await capture("03_queues_desktop", "http://localhost:3000/admin/queues", false, 1440, 900);

  // 4. Daily Calendar Desktop
  await capture("04_calendar_desktop", "http://localhost:3000/admin/calendar", false, 1440, 900);

  // 5. Admin Users & RBAC Desktop
  await capture("05_admin_users_desktop", "http://localhost:3000/admin/users", false, 1440, 900);

  // 6. Customer Tracking Waiting (Mobile iPhone)
  await capture("06_customer_track_waiting_mobile", "http://localhost:3000/track/demo-tq-20261025-0002", true);

  // 7. Customer Tracking In Progress (Mobile iPhone)
  await capture("07_customer_track_inprogress_mobile", "http://localhost:3000/track/demo-tq-20261025-0001", true);

  // 8. Customer Tracking Completed (Mobile iPhone)
  await capture("08_customer_track_completed_mobile", "http://localhost:3000/track/demo-tq-20261025-0004", true);

  // 9. Queues Mobile Cards View (Mobile iPhone)
  await capture("09_queues_mobile", "http://localhost:3000/admin/queues", true);

  await browser.close();
  console.log("🎉 All screenshots captured successfully!");
}

run().catch((err) => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});
