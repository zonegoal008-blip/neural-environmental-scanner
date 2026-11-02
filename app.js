const $ = id => document.getElementById(id);
const historyKey = "nes-aqi-history-v1";
const fields = ["temp","humidity","wind","pressure","aqi","pm25","pm10","uv"];
function setStatus(message){$("status").textContent=message;}
function aqiInfo(value){
  if(value<=50)return ["GOOD","Air quality is considered satisfactory. Usual outdoor activities are generally fine."];
  if(value<=100)return ["MODERATE","Air quality is acceptable for most people. Some unusually sensitive people may wish to limit prolonged outdoor exertion."];
  if(value<=150)return ["UNHEALTHY FOR SENSITIVE GROUPS","Sensitive people may want to reduce prolonged or heavy outdoor exertion."];
  if(value<=200)return ["UNHEALTHY","Consider reducing prolonged outdoor exertion, especially if you are sensitive to air pollution."];
  if(value<=300)return ["VERY UNHEALTHY","Health alert: consider limiting outdoor exertion and follow local public-health advice."];
  return ["HAZARDOUS","Health warning: avoid relying on this estimate alone and follow local public-health guidance."];
}
function renderHistory(){
  let items=[]; try{items=JSON.parse(localStorage.getItem(historyKey)||"[]")}catch{}
  const host=$("history"); host.innerHTML="";
  if(!items.length){host.innerHTML='<p class="hint">Your scan history will appear here.</p>';return;}
  const max=Math.max(100,...items.map(x=>x.aqi));
  items.slice(-12).forEach(x=>{
    const wrap=document.createElement("div");wrap.className="bar-wrap";
    const bar=document.createElement("div");bar.className="bar";bar.style.height=`${Math.max(4,x.aqi/max*88)}%`;bar.title=`AQI ${x.aqi}`;
    const label=document.createElement("span");label.className="bar-label";label.textContent=x.time;
    wrap.append(bar,label);host.append(wrap);
  });
}
async function scan(){
  const lat=Number($("lat").value),lon=Number($("lon").value);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat>90||lon < -180||lon>180){setStatus("CHECK COORDINATES");return;}
  const btn=$("scanBtn");btn.disabled=true;btn.textContent="SCANNING…";setStatus("CONNECTING");
  try{
    const weatherURL=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,pressure_msl&daily=uv_index_max&timezone=auto`;
    const airURL=`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10&timezone=auto`;
    const [wr,ar]=await Promise.all([fetch(weatherURL),fetch(airURL)]);
    if(!wr.ok||!ar.ok)throw new Error("The data service did not respond. Please try again.");
    const [w,a]=await Promise.all([wr.json(),ar.json()]);
    const c=w.current, q=a.current;
    if(!c||!q)throw new Error("Current data is unavailable for these coordinates.");
    $("temp").innerHTML=`${Math.round(c.temperature_2m)}<small>°C</small>`;
    $("humidity").innerHTML=`${Math.round(c.relative_humidity_2m)}<small>%</small>`;
    $("wind").innerHTML=`${Math.round(c.wind_speed_10m)}<small> km/h</small>`;
    $("pressure").innerHTML=`${Math.round(c.pressure_msl)}<small> hPa</small>`;
    $("aqi").textContent=Math.round(q.us_aqi);
    $("pm25").textContent=Number(q.pm2_5).toFixed(1);
    $("pm10").textContent=Number(q.pm10).toFixed(1);
    $("uv").textContent=w.daily?.uv_index_max?.[0] == null ? "--" : Number(w.daily.uv_index_max[0]).toFixed(1);
    const [level,advice]=aqiInfo(q.us_aqi);$("aqiLabel").textContent=level;$("aqiStatus").textContent=level;
    $("adviceTitle").textContent=level;$("advice").textContent=advice;
    const now=new Date();const time=now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
    let items=[];try{items=JSON.parse(localStorage.getItem(historyKey)||"[]")}catch{}
    items.push({aqi:Math.round(q.us_aqi),time});localStorage.setItem(historyKey,JSON.stringify(items.slice(-12)));renderHistory();
    $("updated").textContent=`Last scan: ${now.toLocaleString()} · Coordinates: ${lat}, ${lon}`;
    setStatus("SCAN COMPLETE");
  }catch(err){setStatus("SCAN FAILED");$("updated").textContent=err.message+" Check your internet connection and try again.";}
  finally{btn.disabled=false;btn.innerHTML='RUN SCAN <span>↗</span>';}
}
$("scanBtn").addEventListener("click",scan);
renderHistory();scan();setInterval(scan,15*60*1000);
if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
