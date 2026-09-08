document.addEventListener('DOMContentLoaded', function() {
    
    // 1. MENÚ LATERAL DESPLAZABLE Y OVERLAY
    const menuBtn = document.getElementById('menu-btn');
    const closeBtn = document.getElementById('close-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    menuBtn.addEventListener('click', () => {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    });

    const cerrarMenu = () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    };

    closeBtn.addEventListener('click', cerrarMenu);
    overlay.addEventListener('click', cerrarMenu);

    // 2. ANIMACIÓN DE SCROLL
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => observer.observe(el));

    // 3. MAPA DE SISMOS (Leaflet)
    const mapa = L.map('mapa').setView([4.5709, -74.2973], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap | Datos: SGC / USGS'
    }).addTo(mapa);

    const urlSGCOriginal = 'https://geoapps.sgc.gov.co/arcgis/rest/services/Sismos/Sismos_recientes/MapServer/0/query?where=1=1&outFields=*&outSR=4326&f=geojson';
    const urlSGC = `https://corsproxy.io/?${encodeURIComponent(urlSGCOriginal)}`;
    const urlUSGS = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=-4.5&maxlatitude=13.5&minlongitude=-79.0&maxlongitude=-66.0&minmagnitude=2.0';

    let ultimoSismoId = null;
    let alertasActivadas = false;
    const sonidoAlerta = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    const grupoMarcadores = L.layerGroup().addTo(mapa);
    const btnAlertas = document.getElementById('btn-alertas');

    btnAlertas.addEventListener('click', () => {
        alertasActivadas = !alertasActivadas;
        if (alertasActivadas) {
            btnAlertas.innerHTML = '🔔 Alertas Sonoras Activadas';
            btnAlertas.style.backgroundColor = '#27ae60';
            btnAlertas.style.color = '#fff';
            sonidoAlerta.volume = 0;
            sonidoAlerta.play().then(() => {
                sonidoAlerta.pause();
                sonidoAlerta.currentTime = 0;
                sonidoAlerta.volume = 1;
            }).catch(e => console.log('Audio bloqueado'));
        } else {
            btnAlertas.innerHTML = '🔇 Alertas Sonoras Desactivadas';
            btnAlertas.style.backgroundColor = ''; 
            btnAlertas.style.color = '';
        }
    });

    function obtenerColor(magnitud) {
        if (magnitud >= 5.0) return '#e74c3c';
        if (magnitud >= 3.5) return '#e67e22';
        return '#f1c40f';
    }

    function calcularTiempoTranscurrido(timestamp) {
        const minutos = Math.floor((new Date() - new Date(timestamp)) / 1000 / 60);
        if (minutos < 60) return `Hace ${minutos} minutos`;
        const horas = Math.floor(minutos / 60);
        if (horas < 24) return `Hace ${horas} horas`;
        return `Hace ${Math.floor(horas / 24)} días`;
    }

    async function obtenerDatosNormalizados() {
        try {
            const resSGC = await fetch(urlSGC);
            if (!resSGC.ok) throw new Error("SGC HTTP Error");
            const datosSGC = await resSGC.json();
            if (!datosSGC.features || datosSGC.features.length === 0) throw new Error("SGC sin datos");

            return datosSGC.features.slice(0, 10).map(s => ({
                id: s.properties.OBJECTID,
                lat: s.geometry.coordinates[1],
                lng: s.geometry.coordinates[0],
                mag: parseFloat(s.properties.MAGNITUD || s.properties.magnitud).toFixed(1),
                lugar: s.properties.DEPARTAMENTO ? `${s.properties.MUNICIPIO}, ${s.properties.DEPARTAMENTO}` : (s.properties.MUNICIPIO || 'Colombia'),
                prof: s.properties.PROFUNDIDAD || 'Superficial',
                fecha: s.properties.FECHA_UTC || s.properties.FECHA,
                fuente: 'SGC'
            }));
        } catch (error) {
            console.warn("Fallo el SGC, cambiando a USGS...", error);
            const resUSGS = await fetch(urlUSGS);
            const datosUSGS = await resUSGS.json();
            const sismosColombia = datosUSGS.features.filter(s => s.properties.place && s.properties.place.toLowerCase().includes('colombia'));

            return sismosColombia.slice(0, 10).map(s => ({
                id: s.id,
                lat: s.geometry.coordinates[1],
                lng: s.geometry.coordinates[0],
                mag: parseFloat(s.properties.mag).toFixed(1),
                lugar: s.properties.place.replace(' of ', ' de ').replace(' W ', ' O ').replace(' NW ', ' NO ').replace(' SW ', ' SO '),
                prof: s.geometry.coordinates[2].toFixed(1),
                fecha: s.properties.time,
                fuente: 'USGS'
            }));
        }
    }

    async function cargarSismos() {
        const sismos = await obtenerDatosNormalizados();
        if (!sismos || sismos.length === 0) {
            document.getElementById('lista-sismos-dinamica').innerHTML = '<p style="padding: 10px;">No hay sismos recientes reportados.</p>';
            return;
        }

        const sismoMasReciente = sismos[0];
        if (ultimoSismoId && ultimoSismoId !== sismoMasReciente.id) {
            if (alertasActivadas) sonidoAlerta.play().catch(() => {});
            mapa.flyTo([sismoMasReciente.lat, sismoMasReciente.lng], 7, { duration: 1.5 });
        }
        ultimoSismoId = sismoMasReciente.id;

        grupoMarcadores.clearLayers();
        const contenedorLista = document.getElementById('lista-sismos-dinamica');
        contenedorLista.innerHTML = '';

        sismos.forEach((sismo, index) => {
            const circulo = L.circleMarker([sismo.lat, sismo.lng], {
                radius: sismo.mag * 3.5,            
                fillColor: obtenerColor(sismo.mag),
                color: '#000', weight: 1, opacity: 0.8, fillOpacity: 0.7
            }).addTo(grupoMarcadores);

            circulo.bindPopup(`<strong>Magnitud:</strong> M ${sismo.mag}<br><strong>Lugar:</strong> ${sismo.lugar}<br><strong>Profundidad:</strong> ${sismo.prof} km<br><small>Fuente: ${sismo.fuente}</small>`);

            const card = document.createElement('div');
            card.className = 'sismo-card';
            card.style.animationDelay = `${index * 0.1}s`; 
            card.innerHTML = `
                <h4>${sismo.lugar} <span style="font-size: 10px; background: #eee; padding: 2px 4px; border-radius: 4px; float: right;">${sismo.fuente}</span></h4>
                <p>Magnitud: ${sismo.mag} | Prof: ${sismo.prof} km</p>
                <small>${calcularTiempoTranscurrido(sismo.fecha)}</small>
            `;
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                mapa.flyTo([sismo.lat, sismo.lng], 8);
                circulo.openPopup();
            });

            contenedorLista.appendChild(card);
        });
    }

    cargarSismos();
    setInterval(cargarSismos, 120000);

    // 4. LÓGICA DEL MENÚ DE JUEGOS
    const selectorJuegos = document.getElementById('selector-juegos');
    const juegoBotiquin = document.getElementById('juego-botiquin');

    window.abrirJuego = function(juego) {
        selectorJuegos.classList.add('oculto');
        if (juego === 'botiquin') {
            juegoBotiquin.classList.remove('oculto');
            iniciarJuegoContrarreloj(); // Inicia el temporizador
        }
    };

    window.volverSelector = function() {
        juegoBotiquin.classList.add('oculto');
        selectorJuegos.classList.remove('oculto');
        clearInterval(intervaloTemporizador); // Detiene el temporizador al salir
        juegoActivo = false;
    };

    // 5. TOAST NOTIFICATIONS
    const toast = document.getElementById('toast');
    function mostrarToast(mensaje) {
        toast.innerText = mensaje;
        toast.className = 'toast-visible';
        setTimeout(() => toast.className = 'toast-oculto', 3000);
    }

    // ==========================================
    // VENTANA MODAL PERSONALIZADA (Ganar/Perder)
    // ==========================================
    const modalVictoria = document.getElementById('modal-victoria');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalMensaje = document.getElementById('modal-mensaje');
    const modalBtn = document.getElementById('modal-btn');
    const modalIcono = document.getElementById('modal-icono');
    let modalCallback = null;

    function mostrarModalJuego(titulo, mensaje, icono, callback) {
        modalTitulo.innerText = titulo;
        modalMensaje.innerText = mensaje;
        modalIcono.innerText = icono;
        modalCallback = callback;
        modalVictoria.classList.add('modal-visible');
    }

    modalBtn.addEventListener('click', () => {
        modalVictoria.classList.remove('modal-visible');
        if (modalCallback) {
            modalCallback(); 
            modalCallback = null;
        }
    });

    // 6. JUEGO: ARMA TU BOTIQUÍN (CONTRARRELOJ Y ALEATORIO)
    const zonaMochila = document.getElementById('zona-mochila');
    const mochilaGrid = document.getElementById('mochila-grid');
    const almacenGrid = document.querySelector('.almacen-grid');
    const contadorTexto = document.getElementById('contador-botiquin');
    const temporizadorDisplay = document.getElementById('temporizador'); // Requiere <div id="temporizador"> en HTML
    
    let objetosCorrectos = 0;
    const metaObjetos = 6;
    let tiempoRestante = 30;
    let intervaloTemporizador;
    let juegoActivo = false;

    // Base de datos de objetos posibles
    const poolObjetos = [
        { id: 'agua', icono: '💧', nombre: 'Agua', vital: true },
        { id: 'linterna', icono: '🔦', nombre: 'Linterna', vital: true },
        { id: 'radio', icono: '📻', nombre: 'Radio', vital: true },
        { id: 'vendas', icono: '🩹', nombre: 'Vendas', vital: true },
        { id: 'comida', icono: '🥫', nombre: 'Comida', vital: true },
        { id: 'manta', icono: '🛌', nombre: 'Manta', vital: true },
        { id: 'silbato', icono: '🌬️', nombre: 'Silbato', vital: true },
        { id: 'navaja', icono: '🔪', nombre: 'Navaja', vital: true },
        { id: 'laptop', icono: '💻', nombre: 'Laptop', vital: false, msj: 'Sin energía ni internet.' },
        { id: 'peluche', icono: '🧸', nombre: 'Peluche', vital: false, msj: 'Ocupa espacio vital.' },
        { id: 'gaseosa', icono: '🥤', nombre: 'Gaseosa', vital: false, msj: 'Te deshidratará.' },
        { id: 'dinero', icono: '💸', nombre: 'Dinero', vital: false, msj: 'No sirve los primeros días.' },
        { id: 'secador', icono: '💇‍♀️', nombre: 'Secador', vital: false, msj: 'Cero electricidad.' },
        { id: 'espejo', icono: '🪞', nombre: 'Espejo', vital: false, msj: 'Riesgo de cortarse.' },
        { id: 'joyas', icono: '💎', nombre: 'Joyas', vital: false, msj: 'Imprácticas.' },
        { id: 'libros', icono: '📚', nombre: 'Libros', vital: false, msj: 'Mucho peso extra.' }
    ];

    function mezclarArreglo(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function generarNivel() {
        mochilaGrid.innerHTML = '';
        almacenGrid.innerHTML = '';
        objetosCorrectos = 0;
        contadorTexto.innerText = `Objetos vitales: 0 / ${metaObjetos}`;
        
        const vitales = mezclarArreglo(poolObjetos.filter(obj => obj.vital)).slice(0, 6);
        const inutiles = mezclarArreglo(poolObjetos.filter(obj => !obj.vital)).slice(0, 6);
        const objetosSeleccionados = mezclarArreglo([...vitales, ...inutiles]);

        objetosSeleccionados.forEach(obj => {
            const div = document.createElement('div');
            div.className = `item-pixel ${obj.vital ? 'útil' : 'inútil'}`;
            div.draggable = true;
            div.id = `item-${obj.id}`;
            div.setAttribute('data-vital', obj.vital);
            if (!obj.vital) div.setAttribute('data-mensaje', obj.msj);
            div.innerHTML = `${obj.icono} ${obj.nombre}`;
            
            div.addEventListener('dragstart', (e) => {
                if (!juegoActivo || e.target.getAttribute('draggable') === 'false') return;
                e.dataTransfer.setData('text/plain', e.target.id);
                setTimeout(() => e.target.style.opacity = '1', 0);
            });
            div.addEventListener('dragend', (e) => e.target.style.opacity = '1');

            almacenGrid.appendChild(div);
        });
    }

    function actualizarTemporizador() {
        if (!temporizadorDisplay) return; 
        temporizadorDisplay.innerText = `⏳ ${tiempoRestante}s`;
        
        if (tiempoRestante <= 10) {
            temporizadorDisplay.classList.add('tiempo-critico');
        } else {
            temporizadorDisplay.classList.remove('tiempo-critico');
        }

        if (tiempoRestante <= 0) {
            detenerJuego(false);
        }
        tiempoRestante--;
    }

    function iniciarJuegoContrarreloj() {
        clearInterval(intervaloTemporizador);
        tiempoRestante = 30;
        juegoActivo = true;
        generarNivel();
        actualizarTemporizador();
        intervaloTemporizador = setInterval(actualizarTemporizador, 1000);
    }

    function detenerJuego(victoria) {
        clearInterval(intervaloTemporizador);
        juegoActivo = false;
        if (temporizadorDisplay) temporizadorDisplay.classList.remove('tiempo-critico');
        
        if (victoria) {
            mostrarModalJuego(
                '¡Sobreviviste!',
                `Lograste armar tu mochila con ${tiempoRestante + 1} segundos de sobra.`,
                '🎒',
                iniciarJuegoContrarreloj
            );
        } else {
            mostrarModalJuego(
                '¡Se acabó el tiempo!',
                'No lograste armar el botiquín a tiempo. En una emergencia real, cada segundo cuenta.',
                '⏳',
                iniciarJuegoContrarreloj
            );
        }
    }

    zonaMochila.addEventListener('dragover', (e) => {
        if (!juegoActivo) return;
        e.preventDefault();
        zonaMochila.classList.add('drag-over');
    });

    zonaMochila.addEventListener('dragleave', () => zonaMochila.classList.remove('drag-over'));

    zonaMochila.addEventListener('drop', (e) => {
        if (!juegoActivo) return;
        e.preventDefault();
        zonaMochila.classList.remove('drag-over');

        const itemId = e.dataTransfer.getData('text/plain');
        const elementoArrastrado = document.getElementById(itemId);

        if (!elementoArrastrado || elementoArrastrado.parentElement === mochilaGrid) return;

        const esVital = elementoArrastrado.getAttribute('data-vital') === 'true';

        if (esVital) {
            mochilaGrid.appendChild(elementoArrastrado);
            elementoArrastrado.setAttribute('draggable', 'false');
            elementoArrastrado.style.cursor = 'default';
            objetosCorrectos++;
            contadorTexto.innerText = `Objetos vitales: ${objetosCorrectos} / ${metaObjetos}`;

            if (objetosCorrectos === metaObjetos) {
                detenerJuego(true);
            }
        } else {
            elementoArrastrado.classList.add('error-shake');
            const mensajeError = elementoArrastrado.getAttribute('data-mensaje');
            mostrarToast(mensajeError);
            
            // Penalización de tiempo
            tiempoRestante = Math.max(0, tiempoRestante - 2); 
            actualizarTemporizador();

            setTimeout(() => elementoArrastrado.classList.remove('error-shake'), 400);
        }
    });

});