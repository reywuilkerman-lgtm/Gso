// --- SISTEMA DE AUDIO TÁCTICO GGO ---
function sonar(tipo) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (tipo === 'ingreso') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
        oscillator.frequency.setValueAtTime(1760, audioCtx.currentTime + 0.04);
    } else {
        oscillator.type = 'sawtooth'; 
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); 
        oscillator.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.06);
    }
    gainNode.gain.setValueAtTime(0.03, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.12);
}

// --- CAMBIO DE MULTI-PANEL TÁCTICO ---
function openTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.ggo-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
    event.currentTarget.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
    const tasaGuardada = localStorage.getItem('tasaBCV');
    if (tasaGuardada) document.getElementById('tasaBCV').value = tasaGuardada;
    document.getElementById('tasaBCV').addEventListener('input', (e) => {
        localStorage.setItem('tasaBCV', e.target.value);
        actualizarSaldosTotales();
    });
    actualizarSaldosTotales();
    mostrarHistorial();
    
    const fechaLog = new Date().toLocaleDateString('es-VE', {day:'2-digit', month:'2-digit', year:'numeric'});
    document.getElementById('date-now').innerText = "[" + fechaLog + "]";
});

// --- PARSER DE MONEDA (Formato local venezolano: 70.567,84) ---
function formatearMoneda(monto, esBS) {
    const config = esBS 
        ? { locale: 'es-VE', sufijo: ' BS' } 
        : { locale: 'en-US', sufijo: '' };

    let textoFormateado = monto.toLocaleString(config.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return esBS ? `${textoFormateado}${config.sufijo}` : `$ ${textoFormateado}`;
}

// --- LOGICA FINANCIERA ---
function registrarMovimiento(tipo) {
    const tasa = parseFloat(document.getElementById('tasaBCV').value) || 1;
    const montoI = document.getElementById('montoInput');
    const conceptoI = document.getElementById('concepto');
    const moneda = document.getElementById('monedaInput').value;
    const mOrig = parseFloat(montoI.value);
    if (!mOrig || mOrig <= 0) return;
    
    let bs, usd;
    if (moneda === "USD") {
        usd = tipo === 'retiro' ? -mOrig : mOrig;
        bs = usd * tasa;
    } else {
        bs = tipo === 'retiro' ? -mOrig : mOrig;
        usd = bs / tasa;
    }
    const mov = { 
        id: Date.now(), 
        concepto: conceptoI.value.trim().toUpperCase() || (tipo === 'ingreso' ? 'INBOUND_FUNDS' : 'OUTBOUND_EXPENSE'), 
        bs, usd, tipo, 
        fecha: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) 
    };
    let hist = JSON.parse(localStorage.getItem('finanzas')) || [];
    hist.unshift(mov);
    localStorage.setItem('finanzas', JSON.stringify(hist));
    montoI.value = ""; conceptoI.value = "";
    actualizarSaldosTotales();
    mostrarHistorial();
    sonar(tipo);
}

function actualizarSaldosTotales() {
    const hist = JSON.parse(localStorage.getItem('finanzas')) || [];
    let tBS = 0;
    hist.forEach(m => tBS += m.bs);
    const tasaActual = parseFloat(document.getElementById('tasaBCV').value) || 1;
    
    document.getElementById('displayBS').innerText = formatearMoneda(tBS, true);
    document.getElementById('displayUSD').innerText = formatearMoneda(tBS / tasaActual, false);
}

function mostrarHistorial() {
    const lista = document.getElementById('listaHistorial');
    const hist = JSON.parse(localStorage.getItem('finanzas')) || [];
    
    if(hist.length === 0){
        lista.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-muted); font-size:0.75rem;">NO DATA DISCOVERED // SYSTEM IDLE</div>`;
        return;
    }

    lista.innerHTML = hist.map(m => `
        <div class="history-item ${m.tipo}">
            <div><strong>> ${m.concepto}</strong><small>TIMESTAMP: ${m.fecha}</small></div>
            <div style="text-align:right">
                <div style="font-weight:bold; color:${m.tipo==='retiro'?'var(--ggo-orange)':'var(--ggo-green)'}">
                    ${m.tipo==='retiro'?'-':'+'}${formatearMoneda(Math.abs(m.bs), true)}
                </div>
                <small style="color:#fff; opacity:0.7;">${formatearMoneda(Math.abs(m.usd), false)}</small>
            </div>
        </div>
    `).join('');
}

function limpiarHistorial() {
    if (confirm("CRITICAL: CONFIRM TOTAL DATA WIPE?")) {
        localStorage.removeItem('finanzas');
        actualizarSaldosTotales();
        mostrarHistorial();
    }
}

// --- MATRIX CONVERTER ---
function convertirDivisa(desde) {
    const tasa = parseFloat(document.getElementById('tasaBCV').value) || 1;
    const inpBS = document.getElementById('convBS');
    const inpUSD = document.getElementById('convUSD');
    const resBox = document.getElementById('resultadoConv');
    const txtRes = document.getElementById('txtResultado');
    if(desde === 'BS') {
        const val = parseFloat(inpBS.value);
        if(!val) { inpUSD.value = ""; resBox.style.display="none"; return; }
        const calculoUSD = val / tasa;
        inpUSD.value = calculoUSD.toFixed(2);
        txtRes.innerText = `${formatearMoneda(val, true)} == ${formatearMoneda(calculoUSD, false)}`;
    } else {
        const val = parseFloat(inpUSD.value);
        if(!val) { inpBS.value = ""; resBox.style.display="none"; return; }
        const calculoBS = val * tasa;
        inpBS.value = calculoBS.toFixed(2);
        txtRes.innerText = `${formatearMoneda(val, false)} == ${formatearMoneda(calculoBS, true)}`;
    }
    resBox.style.display = "block";
}
