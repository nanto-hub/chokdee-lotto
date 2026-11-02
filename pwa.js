(() => {
  "use strict";
  const dialog = document.getElementById("pwaDialog");
  const installButton = document.getElementById("pwaInstallNow");
  const status = document.getElementById("pwaStatus");
  const instructions = document.getElementById("pwaInstructions");
  const bar = document.getElementById("pwaInstallBar");
  const menu = document.getElementById("menuInstall");
  const standalone = window.matchMedia("(display-mode: standalone)");
  let installPrompt = null;
  let registrationError = false;
  let installing = false;
  let installedDuringSession = false;

  function isInstalled() {
    return installedDuringSession || standalone.matches || navigator.standalone === true;
  }

  function isLineBrowser() {
    return /Line\//i.test(navigator.userAgent) ||
      (typeof liff !== "undefined" && liff.isInClient());
  }

  function render() {
    const installed = isInstalled();
    bar.hidden = installed;
    menu.hidden = installed;
    installButton.hidden = installed || !installPrompt || isLineBrowser();
    installButton.disabled = installing;
    if (installed) {
      instructions.textContent = "คุณกำลังใช้งานร้านจากไอคอนที่ติดตั้งแล้ว";
    } else if (isLineBrowser()) {
      instructions.textContent = "คุณกำลังเปิดผ่าน LINE\nกดเมนู ⋮ หรือ … แล้วเลือกเปิดในเบราว์เซอร์ภายนอก หรือคัดลอกลิงก์ร้านไปเปิดใน Chrome (Android) หรือ Safari (iPhone) จากนั้นเลือกติดตั้งหรือเพิ่มไปยังหน้าจอโฮม";
    } else if (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
               (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
      instructions.textContent = "บน iPhone / iPad ให้เปิดร้านใน Safari\nกดปุ่มแชร์ → เพิ่มไปยังหน้าจอโฮม → เพิ่ม\nหากมีตัวเลือกเปิดเป็นเว็บแอป ให้เปิดตัวเลือกนี้";
    } else if (installPrompt) {
      instructions.textContent = "กดปุ่มติดตั้งด้านล่าง แล้วทำตามหน้าต่างยืนยันของเบราว์เซอร์";
    } else {
      instructions.textContent = "เปิดร้านใน Chrome หรือ Edge แล้วเลือกเมนู ⋮ → ติดตั้งแอป หรือเพิ่มไปยังหน้าจอหลัก\nชื่อเมนูขึ้นอยู่กับอุปกรณ์และเบราว์เซอร์ หากไม่มีเมนูนี้ยังเปิดร้านผ่านลิงก์ได้ตามปกติ";
    }
    if (registrationError) {
      status.textContent = "เตรียมระบบติดตั้งไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วเปิดหน้าเว็บใหม่ ยังใช้งานร้านออนไลน์ได้ตามปกติ";
    }
  }

  function openInstall(event) {
    event.preventDefault();
    document.getElementById("myDropdown").style.display = "none";
    status.textContent = "";
    render();
    if (!dialog.open) dialog.showModal();
  }

  document.getElementById("pwaOpenInstall").addEventListener("click", openInstall);
  menu.addEventListener("click", openInstall);
  document.getElementById("pwaClose").addEventListener("click", () => dialog.close());
  document.getElementById("pwaCopyLink").addEventListener("click", () => copyStoreLink());
  standalone.addEventListener("change", render);

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    render();
  });
  window.addEventListener("appinstalled", () => {
    installedDuringSession = true;
    installPrompt = null;
    render();
    status.textContent = "ติดตั้งแล้ว เปิดร้านได้จากไอคอนบนหน้าจอ";
  });
  installButton.addEventListener("click", async () => {
    if (!installPrompt || installing) return;
    const prompt = installPrompt;
    installPrompt = null;
    installing = true;
    installButton.disabled = true;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      status.textContent = choice.outcome === "accepted"
        ? "ยืนยันการติดตั้งแล้ว รอเบราว์เซอร์ดำเนินการให้เสร็จ"
        : "ยังไม่ได้ติดตั้ง คุณยังใช้งานร้านผ่านเว็บได้ตามปกติ";
    } catch (error) {
      console.error("PWA install failed:", error);
      status.textContent = "ติดตั้งไม่สำเร็จ กรุณาลองผ่านเมนูเบราว์เซอร์ หรือเปิดหน้าเว็บใหม่";
    } finally {
      installing = false;
      render();
    }
  });

  function showUpdate() {
    const notice = document.getElementById("pwaUpdateNotice");
    notice.hidden = false;
    notice.textContent = "มีเว็บเวอร์ชันใหม่ หลังทำรายการเสร็จให้ปิดหน้าต่างร้านทั้งหมดแล้วเปิดใหม่เพื่ออัปเดต";
  }

  render();
  if ("serviceWorker" in navigator && window.isSecureContext) {
    navigator.serviceWorker.register("./sw.js", { scope: "./", updateViaCache: "none" })
      .then(registration => {
        if (registration.waiting) showUpdate();
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) showUpdate();
          });
        });
      })
      .catch(error => {
        console.error("PWA registration failed:", error);
        registrationError = true;
        const notice = document.getElementById("pwaUpdateNotice");
        notice.hidden = false;
        notice.textContent = "เตรียมระบบติดตั้งไม่สำเร็จ กรุณาเปิดหน้าเว็บใหม่ ยังใช้งานร้านออนไลน์ได้ตามปกติ";
        render();
      });
  }
})();
