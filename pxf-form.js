/* PreXion custom HubSpot form
   Hosted script: renders the form into <div id="pxf-form-root"></div> and submits to HubSpot.
   Companion files in the same folder: pxf-form.css (styles), pxf-cities.js (U.S. city list). */
(function () {
  /* Folder this script was loaded from, used to find pxf-cities.js */
  var me = document.currentScript;
  var SCRIPT_BASE = me && me.src ? me.src.replace(/[^\/?#]*([?#].*)?$/, "") : "";

  var FORM_HTML = [
    '<form id="pxf-form" novalidate>',
    '  <div class="pxf-field">',
    '    <label class="pxf-label" for="pxf-firstname">Name<span class="pxf-req">*</span></label>',
    '    <input id="pxf-firstname" name="firstname" type="text" autocomplete="name" required>',
    '    <div class="pxf-err">Please complete this required field.</div>',
    '  </div>',
    '  <div class="pxf-field">',
    '    <label class="pxf-label" for="pxf-email">Email<span class="pxf-req">*</span></label>',
    '    <input id="pxf-email" name="email" type="email" autocomplete="email" required>',
    '    <div class="pxf-err">Please enter a valid email address.</div>',
    '  </div>',
    '  <div class="pxf-field">',
    '    <label class="pxf-label" for="pxf-state">State<span class="pxf-req">*</span></label>',
    '    <select id="pxf-state" name="state_dropdown" required>',
    '      <option value="" disabled selected>Please Select</option>',
    '    </select>',
    '    <div class="pxf-err">Please select an option from the dropdown menu.</div>',
    '  </div>',
    '  <div class="pxf-field">',
    '    <label class="pxf-label" for="pxf-city">City<span class="pxf-req">*</span></label>',
    '    <select id="pxf-city" required disabled>',
    '      <option value="">Select a state first</option>',
    '    </select>',
    '    <input id="pxf-city-other" class="pxf-city-other" type="text" autocomplete="address-level2" placeholder="Type your city" hidden>',
    '    <div class="pxf-err">Please select your city.</div>',
    '  </div>',
    '  <div class="pxf-field">',
    '    <label class="pxf-label" for="pxf-phone">Phone Number<span class="pxf-req">*</span></label>',
    '    <div class="pxf-phone-row">',
    '      <select id="pxf-dial" class="pxf-dial" aria-label="Country code"></select>',
    '      <input id="pxf-phone" name="phone_number" type="tel" autocomplete="tel-national" required>',
    '    </div>',
    '    <div class="pxf-err">Please enter a valid phone number.</div>',
    '  </div>',
    '  <div class="pxf-field">',
    '    <label class="pxf-label" for="pxf-profile">Customer Profile<span class="pxf-req">*</span></label>',
    '    <select id="pxf-profile" name="customer_profile_dropdown" required>',
    '      <option value="" disabled selected>Please Select</option>',
    '    </select>',
    '    <div class="pxf-err">Please select an option from the dropdown menu.</div>',
    '  </div>',
    '  <div class="pxf-field">',
    '    <label class="pxf-consent">',
    '      <input type="checkbox" name="data_privacy" value="true" required>',
    '      <span>By submitting your information, you consent to receive relevant targeted emails from us. You can opt out from receiving emails from us at any time.<span class="pxf-req">*</span></span>',
    '    </label>',
    '    <div class="pxf-err">Please complete this required field.</div>',
    '  </div>',
    '  <button type="submit" class="pxf-submit">Submit</button>',
    '  <div class="pxf-fail" id="pxf-fail" hidden></div>',
    '</form>',
    ''
  ].join("\n");

  var PORTAL_ID = "52079391";
  var FORM_ID = "4351ae35-252e-455c-9d0b-656437961879";
  var ENDPOINT = "https://api.hsforms.com/submissions/v3/integration/submit/" + PORTAL_ID + "/" + FORM_ID;
  /* Optional: internal name of a HubSpot contact property that stores the raw IP (e.g. "ip_address").
     Leave "" until that property exists AND is added to the HubSpot form as a hidden field. */
  var IP_FIELD = "";
  var STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];
  var PROFILES = ["Buyer","Clinic Manager","Dental Clinic","Dentist","Distributor","Franchise","Hospital","Imaging Center","Investor","Other","Public Sector Manager","Radiologist","Receptionist","Veterinarian"];
  /* ---- Render the form into the placeholder <div id="pxf-form-root"> ---- */
  var root = document.getElementById("pxf-form-root");
  if (!root) return;
  root.innerHTML = FORM_HTML;
  var form = document.getElementById("pxf-form");
  if (!form) return;
  function fill(sel, list) {
    list.forEach(function (v) { var o = document.createElement("option"); o.value = v; o.textContent = v; sel.appendChild(o); });
  }
  fill(form.querySelector("[name=state_dropdown]"), STATES);
  fill(form.querySelector("[name=customer_profile_dropdown]"), PROFILES);
  /* ---- City dropdown (list of cities per state) ----
     The city list lives in pxf-cities.js, loaded from the same folder as this file.
     If it fails to load within 10 seconds, City becomes a plain text box. */
  var CITY_DATA_URL = SCRIPT_BASE ? SCRIPT_BASE + "pxf-cities.js" : "";
  var OTHER = "__other__";
  var stateSel = form.querySelector("[name=state_dropdown]");
  var citySel = form.querySelector("#pxf-city");
  var cityOther = form.querySelector("#pxf-city-other");
  var cityMode = "loading";
  function cityOption(label, value) {
    var o = document.createElement("option");
    o.value = value;
    o.textContent = label;
    citySel.appendChild(o);
  }
  function useTextCity() {
    cityMode = "text";
    citySel.hidden = true;
    citySel.required = false;
    cityOther.hidden = false;
    cityOther.required = true;
    cityOther.placeholder = "";
    form.querySelector("label[for=pxf-city]").htmlFor = "pxf-city-other";
  }
  function renderCities() {
    if (cityMode === "text") return;
    var list = window.PXF_CITIES ? window.PXF_CITIES[stateSel.value] : null;
    citySel.innerHTML = "";
    if (!stateSel.value) {
      cityOption("Select a state first", "");
    } else if (!list) {
      cityOption("Loading cities...", "");
    } else {
      cityOption("Please Select", "");
      var frag = document.createDocumentFragment();
      list.forEach(function (c) { var o = document.createElement("option"); o.value = c; o.textContent = c; frag.appendChild(o); });
      citySel.appendChild(frag);
      cityOption("Other / not listed", OTHER);
    }
    citySel.disabled = !list;
    cityOther.hidden = true;
    cityOther.required = false;
    cityOther.value = "";
  }
  function cityValue() {
    if (cityMode === "text") return cityOther.value.trim();
    if (citySel.value === OTHER) return cityOther.value.trim();
    return citySel.value;
  }
  stateSel.addEventListener("change", renderCities);
  citySel.addEventListener("change", function () {
    var other = citySel.value === OTHER;
    cityOther.hidden = !other;
    cityOther.required = other;
    if (other) cityOther.focus();
  });
  if (window.PXF_CITIES) {
    cityMode = "list";
  } else if (!CITY_DATA_URL) {
    useTextCity();
  } else {
    var cityScript = document.createElement("script");
    var cityTimer = setTimeout(function () { if (!window.PXF_CITIES) useTextCity(); }, 10000);
    cityScript.src = CITY_DATA_URL;
    cityScript.onload = function () {
      clearTimeout(cityTimer);
      if (cityMode === "text") return;
      if (window.PXF_CITIES) { cityMode = "list"; renderCities(); } else { useTextCity(); }
    };
    cityScript.onerror = function () { clearTimeout(cityTimer); useTextCity(); };
    document.head.appendChild(cityScript);
  }
  /* Country calling codes: "Country|code". First entry is the default. */
  var DIAL = ["United States|1","Canada|1","Afghanistan|93","Albania|355","Algeria|213","Andorra|376","Angola|244","Argentina|54","Armenia|374","Australia|61","Austria|43","Azerbaijan|994","Bahamas|1","Bahrain|973","Bangladesh|880","Barbados|1","Belarus|375","Belgium|32","Belize|501","Benin|229","Bhutan|975","Bolivia|591","Bosnia and Herzegovina|387","Botswana|267","Brazil|55","Brunei|673","Bulgaria|359","Burkina Faso|226","Burundi|257","Cambodia|855","Cameroon|237","Cape Verde|238","Central African Republic|236","Chad|235","Chile|56","China|86","Colombia|57","Costa Rica|506","Croatia|385","Cuba|53","Cyprus|357","Czech Republic|420","Denmark|45","Djibouti|253","Dominican Republic|1","DR Congo|243","Ecuador|593","Egypt|20","El Salvador|503","Estonia|372","Ethiopia|251","Fiji|679","Finland|358","France|33","Gabon|241","Gambia|220","Georgia|995","Germany|49","Ghana|233","Greece|30","Guatemala|502","Guinea|224","Guyana|592","Haiti|509","Honduras|504","Hong Kong|852","Hungary|36","Iceland|354","India|91","Indonesia|62","Iran|98","Iraq|964","Ireland|353","Israel|972","Italy|39","Ivory Coast|225","Jamaica|1","Japan|81","Jordan|962","Kazakhstan|7","Kenya|254","Kuwait|965","Kyrgyzstan|996","Laos|856","Latvia|371","Lebanon|961","Libya|218","Liechtenstein|423","Lithuania|370","Luxembourg|352","Macau|853","Madagascar|261","Malawi|265","Malaysia|60","Maldives|960","Mali|223","Malta|356","Mauritius|230","Mexico|52","Moldova|373","Monaco|377","Mongolia|976","Montenegro|382","Morocco|212","Mozambique|258","Myanmar|95","Namibia|264","Nepal|977","Netherlands|31","New Zealand|64","Nicaragua|505","Niger|227","Nigeria|234","North Macedonia|389","Norway|47","Oman|968","Pakistan|92","Panama|507","Papua New Guinea|675","Paraguay|595","Peru|51","Philippines|63","Poland|48","Portugal|351","Puerto Rico|1","Qatar|974","Romania|40","Russia|7","Rwanda|250","Saudi Arabia|966","Senegal|221","Serbia|381","Singapore|65","Slovakia|421","Slovenia|386","Somalia|252","South Africa|27","South Korea|82","Spain|34","Sri Lanka|94","Sudan|249","Suriname|597","Sweden|46","Switzerland|41","Syria|963","Taiwan|886","Tajikistan|992","Tanzania|255","Thailand|66","Togo|228","Trinidad and Tobago|1","Tunisia|216","Turkey|90","Turkmenistan|993","Uganda|256","Ukraine|380","United Arab Emirates|971","United Kingdom|44","Uruguay|598","Uzbekistan|998","Venezuela|58","Vietnam|84","Yemen|967","Zambia|260","Zimbabwe|263"];
  var dialSel = form.querySelector("#pxf-dial");
  DIAL.forEach(function (d) {
    var p = d.split("|");
    var o = document.createElement("option");
    o.value = p[1];
    o.textContent = p[0] + " (+" + p[1] + ")";
    dialSel.appendChild(o);
  });
  /* Builds the full international number, e.g. "+1 5551234567" or "+44 7911123456" */
  function fullPhone() {
    var raw = form.querySelector("[name=phone_number]").value.trim();
    if (raw.charAt(0) === "+") return raw;
    var code = dialSel.value;
    var num = raw.replace(/[^0-9]/g, "");
    if (code !== "39") num = num.replace(/^0+/, "");
    return "+" + code + " " + num;
  }
  function getCookie(name) {
    var m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : undefined;
  }
  function isValid(el) {
    if (el.type === "checkbox") return el.checked;
    var v = el.value.trim();
    if (!v) return false;
    if (el.type === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    if (el.type === "tel") return /^[0-9+().\s-]{7,}$/.test(v);
    return true;
  }
  function showError(el, bad) {
    el.classList.toggle("pxf-invalid", bad);
    var err = el.closest(".pxf-field").querySelector(".pxf-err");
    if (err) err.style.display = bad ? "block" : "none";
  }
  function validate() {
    var first = null;
    form.querySelectorAll("input[required], select[required]").forEach(function (el) {
      var bad = !isValid(el);
      showError(el, bad);
      if (bad) { if (!first) first = el; }
    });
    if (first) first.focus();
    return !first;
  }
  function errorMessage(body, status) {
    if (body.errors) { if (body.errors[0]) return body.errors[0].message; }
    if (body.message) return body.message;
    return "HTTP " + status;
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var fail = document.getElementById("pxf-fail");
    fail.hidden = true;
    if (!validate()) return;
    var names = ["firstname","email","state_dropdown","phone_number","customer_profile_dropdown"];
    var fields = names.map(function (n) {
      return { objectTypeId: "0-1", name: n, value: form.querySelector("[name=" + n + "]").value.trim() };
    });
    fields.forEach(function (f) { if (f.name === "phone_number") f.value = fullPhone(); });
    fields.push({ objectTypeId: "0-1", name: "city", value: cityValue() });
    fields.push({ objectTypeId: "0-1", name: "data_privacy", value: form.querySelector("[name=data_privacy]").checked ? "true" : "false" });
    var context = { pageUri: location.href, pageName: document.title };
    var hutk = getCookie("hubspotutk");
    if (hutk) context.hutk = hutk;
    var btn = form.querySelector(".pxf-submit");
    btn.disabled = true;
    /* Look up the visitor's public IP (gives up after 3 seconds so the form never gets stuck) */
    var ipLookup = Promise.race([
      fetch("https://api.ipify.org?format=json").then(function (r) { return r.json(); }).then(function (j) { return j.ip; }),
      new Promise(function (resolve) { setTimeout(resolve, 3000); })
    ]).catch(function () { return undefined; });
    ipLookup
      .then(function (ip) {
        if (ip) {
          context.ipAddress = ip;
          if (IP_FIELD) fields.push({ objectTypeId: "0-1", name: IP_FIELD, value: ip });
        }
        return fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields: fields, context: context })
        });
      })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          if (!res.ok) throw new Error(errorMessage(body, res.status));
          var thanks = document.createElement("div");
          thanks.className = "pxf-thanks";
          thanks.textContent = "Thanks for submitting the form.";
          form.replaceWith(thanks);
        });
      })
      .catch(function (err) {
        console.error("HubSpot submission failed:", err);
        fail.textContent = "Something went wrong. Please try again.";
        fail.hidden = false;
        btn.disabled = false;
      });
  });
  form.addEventListener("change", function (e) {
    if (e.target.classList.contains("pxf-invalid")) {
      if (isValid(e.target)) showError(e.target, false);
    }
  });
  form.addEventListener("input", function (e) {
    if (e.target.classList.contains("pxf-invalid")) {
      if (isValid(e.target)) showError(e.target, false);
    }
  });
})();
