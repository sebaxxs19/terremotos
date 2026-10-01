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

    // Cerrar el menú lateral automáticamente al pulsar en cualquier enlace
    const enlacesSidebar = sidebar.querySelectorAll('a');
    enlacesSidebar.forEach(enlace => {
        enlace.addEventListener('click', cerrarMenu);
    });

    // 1.5. TOGGLE MODO CLARO / OSCURO
    const themeToggle = document.getElementById('theme-toggle');
    const STORAGE_KEY = 'sismonauta-theme';

    // Restaurar preferencia guardada
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            const isLight = document.body.classList.contains('light-mode');
            localStorage.setItem(STORAGE_KEY, isLight ? 'light' : 'dark');
        });
    }

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
                if (entry.target.id === 'guia-supervivencia') {
                    animarTarjetasFase(entry.target.querySelector('.fase-contenido.activa'));
                }
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => observer.observe(el));

    // 2.1 ANIMACIÓN DE ENTRADA ESCALONADA PARA LAS TARJETAS DE LA GUÍA
    const prefiereMenosMovimientoGuia = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function animarTarjetasFase(faseEl) {
        if (!faseEl || prefiereMenosMovimientoGuia) return;
        const elementos = faseEl.querySelectorAll('.guia-card, .guia-alert-banner');
        elementos.forEach((el, i) => {
            el.classList.remove('tarjeta-animada');
            void el.offsetWidth; // fuerza reflow para poder reiniciar la animación
            el.style.animationDelay = `${i * 80}ms`;
            el.classList.add('tarjeta-animada');
        });
    }
    // Se expone globalmente porque mostrarFase() vive fuera de este cierre
    window.animarTarjetasFase = animarTarjetasFase;

    // 2.2 CHECKLIST INTERACTIVO EN LAS TARJETAS DE LA GUÍA DE SUPERVIVENCIA
    function inicializarChecklistGuia() {
        const tarjetas = document.querySelectorAll('.guia-card');

        tarjetas.forEach((card, cardIndex) => {
            const tiles = card.querySelectorAll('.guia-tile');
            if (tiles.length === 0) return;

            // Inyecta la barra de progreso justo debajo del encabezado
            const header = card.querySelector('.guia-card-header');
            const progressHTML = `
                <div class="card-progress-wrap">
                    <div class="card-progress-toprow">
                        <span class="card-progress-label">Preparación</span>
                        <span class="card-progress-text" data-progress-text>0/${tiles.length}</span>
                    </div>
                    <div class="card-progress-track">
                        <div class="card-progress-fill" data-progress-fill></div>
                    </div>
                </div>`;
            if (header) header.insertAdjacentHTML('afterend', progressHTML);

            const textoProgreso = card.querySelector('[data-progress-text]');
            const barraProgreso = card.querySelector('[data-progress-fill]');

            const actualizarProgreso = () => {
                const completados = card.querySelectorAll('.guia-tile.completado').length;
                if (textoProgreso) textoProgreso.textContent = `${completados}/${tiles.length}`;
                if (barraProgreso) {
                    barraProgreso.style.width = `${(completados / tiles.length) * 100}%`;
                    barraProgreso.classList.toggle('completo', completados === tiles.length);
                }
                return completados;
            };

            tiles.forEach((tile, tileIndex) => {
                const tileId = `prep-${cardIndex}-${tileIndex}`;
                tile.setAttribute('tabindex', '0');
                tile.setAttribute('role', 'checkbox');
                tile.setAttribute('aria-checked', 'false');

                // Restaura el estado guardado
                if (localStorage.getItem(`sismonauta-${tileId}`) === '1') {
                    tile.classList.add('completado');
                    tile.setAttribute('aria-checked', 'true');
                }

                const alternar = () => {
                    const yaCompletado = tile.classList.toggle('completado');
                    tile.setAttribute('aria-checked', String(yaCompletado));
                    localStorage.setItem(`sismonauta-${tileId}`, yaCompletado ? '1' : '0');
                    const completados = actualizarProgreso();
                    if (yaCompletado && completados === tiles.length) {
                        const nombreTarjeta = card.querySelector('.guia-card-header h3');
                        mostrarToast(`✅ Completaste: ${nombreTarjeta ? nombreTarjeta.textContent : 'esta sección'}`);
                    }
                };

                tile.addEventListener('click', alternar);
                tile.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        alternar();
                    }
                });
            });

            actualizarProgreso();
        });
    }

    inicializarChecklistGuia();

    // 3. MAPA DE SISMOS - CONSOLA DE SALA DE CONTROL (Leaflet)
    const mapa = L.map('mapa', {
    zoomControl: false
    }).setView([4.5709, -74.2973], 6);

    // Control de zoom en esquina inferior derecha para no estorbar el HUD superior
    L.control.zoom({ position: 'bottomright' }).addTo(mapa);

    // Capa de mapa estilo consola / sala de control (Esri Dark Gray - 100% Gratis sin API Key)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16
    }).addTo(mapa);

    const urlSGCOriginal = 'https://geoapps.sgc.gov.co/arcgis/rest/services/Sismos/Sismos_recientes/MapServer/0/query?where=1=1&outFields=*&outSR=4326&f=geojson';
    const urlSGC = `https://corsproxy.io/?${encodeURIComponent(urlSGCOriginal)}`;
    const urlUSGS = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=-4.5&maxlatitude=13.5&minlongitude=-79.0&maxlongitude=-66.0&minmagnitude=2.0';

    let ultimoSismoId = null;
    let alertasActivadas = false;
    let sismoSeleccionadoId = null;
    let tarjetaActivaElemento = null;
    const sonidoAlerta = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    const grupoMarcadores = L.layerGroup().addTo(mapa);
    
    // Punto 9: Switch de instrumento para alertas sonoras
    const checkAlertas = document.getElementById('check-alertas');
    const labelAlertas = document.getElementById('label-alertas-sonoras');
    const btnAlertasLegacy = document.getElementById('btn-alertas');

    function alternarAlertas(activar) {
        alertasActivadas = activar;
        if (checkAlertas) checkAlertas.checked = activar;
        
        if (alertasActivadas) {
            if (labelAlertas) labelAlertas.innerText = 'Alertas On';
            if (btnAlertasLegacy) {
                btnAlertasLegacy.innerHTML = '🔔 Alertas Sonoras Activadas';
                btnAlertasLegacy.style.backgroundColor = '#27ae60';
                btnAlertasLegacy.style.color = '#fff';
            }
            sonidoAlerta.volume = 0;
            sonidoAlerta.play().then(() => {
                sonidoAlerta.pause();
                sonidoAlerta.currentTime = 0;
                sonidoAlerta.volume = 1;
            }).catch(e => console.log('Audio en espera de interacción'));
            mostrarToast('🔔 Alerta acústica de nuevos sismos activada');
        } else {
            if (labelAlertas) labelAlertas.innerText = 'Alertas Off';
            if (btnAlertasLegacy) {
                btnAlertasLegacy.innerHTML = '🔇 Alertas Sonoras Desactivadas';
                btnAlertasLegacy.style.backgroundColor = '';
                btnAlertasLegacy.style.color = '';
            }
        }
    }

    if (checkAlertas) {
        checkAlertas.addEventListener('change', (e) => alternarAlertas(e.target.checked));
    }
    if (btnAlertasLegacy) {
        btnAlertasLegacy.addEventListener('click', () => alternarAlertas(!alertasActivadas));
    }

    // Punto 2: Colores sincronizados con la leyenda fija de magnitudes
    function obtenerColor(magnitud) {
        if (magnitud >= 5.0) return '#ef4444'; // Fuerte (>5): Terracota / Rojo Sísmico
        if (magnitud >= 3.5) return '#f97316'; // Moderado (3.5–5): Naranja
        return '#eab308';                     // Leve (<3.5): Amarillo Dorado
    }

    function calcularTiempoTranscurrido(timestamp) {
        if (!timestamp) return 'Reciente';
        const tiempoEvento = new Date(timestamp);
        if (isNaN(tiempoEvento.getTime())) return 'Reciente';
        const minutos = Math.floor((new Date() - tiempoEvento) / 1000 / 60);
        if (minutos < 1) return 'Hace un momento';
        if (minutos < 60) return `Hace ${minutos} min`;
        const horas = Math.floor(minutos / 60);
        if (horas < 24) return `Hace ${horas} h`;
        const dias = Math.floor(horas / 24);
        return `Hace ${dias} d`;
    }

    // Punto 4: Esqueleto de carga con tarjetas fantasma pulsantes
    function mostrarEsqueletosCarga() {
        const contenedorLista = document.getElementById('lista-sismos-dinamica');
        if (!contenedorLista) return;
        contenedorLista.innerHTML = `
            <div class="sismo-card skeleton-card">
                <div class="skeleton-mag-box pulse-shimmer"></div>
                <div class="skeleton-info-box">
                    <div class="skeleton-line skeleton-title pulse-shimmer"></div>
                    <div class="skeleton-line skeleton-sub pulse-shimmer"></div>
                    <div class="skeleton-line skeleton-tag pulse-shimmer"></div>
                </div>
            </div>
            <div class="sismo-card skeleton-card">
                <div class="skeleton-mag-box pulse-shimmer"></div>
                <div class="skeleton-info-box">
                    <div class="skeleton-line skeleton-title pulse-shimmer"></div>
                    <div class="skeleton-line skeleton-sub pulse-shimmer"></div>
                    <div class="skeleton-line skeleton-tag pulse-shimmer"></div>
                </div>
            </div>
            <div class="sismo-card skeleton-card">
                <div class="skeleton-mag-box pulse-shimmer"></div>
                <div class="skeleton-info-box">
                    <div class="skeleton-line skeleton-title pulse-shimmer"></div>
                    <div class="skeleton-line skeleton-sub pulse-shimmer"></div>
                    <div class="skeleton-line skeleton-tag pulse-shimmer"></div>
                </div>
            </div>
            <div class="sismo-card skeleton-card">
                <div class="skeleton-mag-box pulse-shimmer"></div>
                <div class="skeleton-info-box">
                    <div class="skeleton-line skeleton-title pulse-shimmer"></div>
                    <div class="skeleton-line skeleton-sub pulse-shimmer"></div>
                    <div class="skeleton-line skeleton-tag pulse-shimmer"></div>
                </div>
            </div>
        `;
    }

    // Punto 7: Mini resumen estadístico antes de la lista larga
    function actualizarMiniResumen(sismos) {
        const totalEl = document.getElementById('resumen-total');
        const magMaxEl = document.getElementById('resumen-mag-max');
        const recienteEl = document.getElementById('resumen-reciente');
        
        if (!totalEl || !magMaxEl || !recienteEl) return;

        if (!sismos || sismos.length === 0) {
            totalEl.innerText = '0';
            magMaxEl.innerText = '--';
            recienteEl.innerText = '--';
            return;
        }

        totalEl.innerText = `${sismos.length} eventos`;

        const magnitudes = sismos.map(s => parseFloat(s.mag)).filter(m => !isNaN(m));
        const magMax = magnitudes.length > 0 ? Math.max(...magnitudes).toFixed(1) : '--';
        magMaxEl.innerText = `M ${magMax}`;

        recienteEl.innerText = calcularTiempoTranscurrido(sismos[0].fecha);
    }

    async function obtenerDatosNormalizados() {
        try {
            const resSGC = await fetch(urlSGC);
            if (!resSGC.ok) throw new Error("SGC HTTP Error");
            const datosSGC = await resSGC.json();
            if (!datosSGC.features || datosSGC.features.length === 0) throw new Error("SGC sin datos");

            return datosSGC.features.slice(0, 10).map(s => ({
                id: s.properties.OBJECTID || `sgc-${Math.random()}`,
                lat: s.geometry.coordinates[1],
                lng: s.geometry.coordinates[0],
                mag: parseFloat(s.properties.MAGNITUD || s.properties.magnitud || 0).toFixed(1),
                lugar: s.properties.DEPARTAMENTO ? `${s.properties.MUNICIPIO}, ${s.properties.DEPARTAMENTO}` : (s.properties.MUNICIPIO || 'Colombia'),
                prof: s.properties.PROFUNDIDAD || 'Superficial',
                fecha: s.properties.FECHA_UTC || s.properties.FECHA,
                fuente: 'SGC'
            }));
        } catch (error) {
            console.warn("Fallo el SGC, cambiando a USGS como respaldo oficial...", error);
            try {
                const resUSGS = await fetch(urlUSGS);
                const datosUSGS = await resUSGS.json();
                const sismosColombia = datosUSGS.features.filter(s => s.properties.place && s.properties.place.toLowerCase().includes('colombia'));

                return sismosColombia.slice(0, 10).map(s => ({
                    id: s.id,
                    lat: s.geometry.coordinates[1],
                    lng: s.geometry.coordinates[0],
                    mag: parseFloat(s.properties.mag || 0).toFixed(1),
                    lugar: s.properties.place.replace(' of ', ' de ').replace(' W ', ' O ').replace(' NW ', ' NO ').replace(' SW ', ' SO '),
                    prof: s.geometry.coordinates[2] ? s.geometry.coordinates[2].toFixed(1) : 'Superficial',
                    fecha: s.properties.time,
                    fuente: 'USGS'
                }));
            } catch (errUSGS) {
                console.error("Ambas fuentes no respondieron:", errUSGS);
                return [];
            }
        }
    }

    // Punto 6: Selección bidireccional y activación de tarjeta
    function activarSismo(sismo, cardElement, circulo, moverMapa = true) {
        if (tarjetaActivaElemento) {
            tarjetaActivaElemento.classList.remove('sismo-activa');
        }

        if (cardElement) {
            cardElement.classList.add('sismo-activa');
            tarjetaActivaElemento = cardElement;
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        sismoSeleccionadoId = sismo.id;

        if (moverMapa) {
            mapa.flyTo([sismo.lat, sismo.lng], 8, { duration: 1.2 });
        }
        if (circulo) {
            circulo.openPopup();
        }
    }

    async function cargarSismos() {
        const contenedorLista = document.getElementById('lista-sismos-dinamica');
        if (!contenedorLista) return;

        // Mostrar estado de carga si la lista está vacía o se refresca
        if (contenedorLista.children.length === 0) {
            mostrarEsqueletosCarga();
        }

        const sismos = await obtenerDatosNormalizados();
        actualizarMiniResumen(sismos);

        // Punto 5: Estado de "sin datos" positivo y constructivo con botón de reintentar
        if (!sismos || sismos.length === 0) {
            contenedorLista.innerHTML = `
                <div class="sin-datos-container">
                    <div class="sin-datos-icono">🛡️</div>
                    <h4>Sin actividad reciente reportada</h4>
                    <p>Es una excelente señal de calma tectónica en el territorio nacional.</p>
                    <button id="btn-reintentar-sismos" class="btn-actualizar-sismos">
                        <span>🔄</span> Actualizar ahora
                    </button>
                </div>
            `;
            const btnReintentar = document.getElementById('btn-reintentar-sismos');
            if (btnReintentar) {
                btnReintentar.addEventListener('click', () => {
                    mostrarEsqueletosCarga();
                    cargarSismos();
                });
            }
            return;
        }

        const sismoMasReciente = sismos[0];
        if (ultimoSismoId && ultimoSismoId !== sismoMasReciente.id) {
            if (alertasActivadas) sonidoAlerta.play().catch(() => {});
            mapa.flyTo([sismoMasReciente.lat, sismoMasReciente.lng], 7, { duration: 1.5 });
            mostrarToast(`⚡ Nuevo sismo detectado: M ${sismoMasReciente.mag} en ${sismoMasReciente.lugar}`);
        }
        ultimoSismoId = sismoMasReciente.id;

        grupoMarcadores.clearLayers();
        contenedorLista.innerHTML = '';

        sismos.forEach((sismo, index) => {
            const colorMag = obtenerColor(sismo.mag);

            // Marcador en el mapa con estilo de radar
            const circulo = L.circleMarker([sismo.lat, sismo.lng], {
                radius: Math.max(sismo.mag * 3.6, 9),
                fillColor: colorMag,
                color: '#ffffff',
                weight: 1.5,
                opacity: 0.9,
                fillOpacity: 0.75,
                className: 'marcador-sismo-radar'
            }).addTo(grupoMarcadores);

            circulo.bindPopup(`
                <div class="popup-sismo-custom">
                    <div class="popup-mag-badge" style="color: ${colorMag}">M ${sismo.mag}</div>
                    <div class="popup-lugar"><strong>${sismo.lugar}</strong></div>
                    <div class="popup-detalles">
                        <div>Profundidad: <span>${sismo.prof} km</span></div>
                        <div>Tiempo: <span>${calcularTiempoTranscurrido(sismo.fecha)}</span></div>
                        <div>Red: <span class="fuente-tag-popup">${sismo.fuente}</span></div>
                    </div>
                </div>
            `);

            // Punto 3: Magnitud gigante coloreada (estilo terracota/severidad) y lugar como subtítulo
            const card = document.createElement('div');
            card.className = 'sismo-card';
            card.id = `card-sismo-${sismo.id}`;
            card.style.animationDelay = `${index * 0.08}s`;

            card.innerHTML = `
                <div class="sismo-mag-col">
                    <span class="sismo-mag-numero" style="color: ${colorMag};">${sismo.mag}</span>
                    <span class="sismo-mag-label">MAG</span>
                </div>
                <div class="sismo-info-col">
                    <div class="sismo-info-header">
                        <h4 class="sismo-lugar-titulo" title="${sismo.lugar}">${sismo.lugar}</h4>
                        <span class="sismo-fuente-badge ${sismo.fuente.toLowerCase()}">${sismo.fuente}</span>
                    </div>
                    <div class="sismo-detalles-meta">
                        <span class="meta-item"><span class="meta-icono">📍</span> Prof: <strong>${sismo.prof} km</strong></span>
                        <span class="meta-item"><span class="meta-icono">⏱️</span> ${calcularTiempoTranscurrido(sismo.fecha)}</span>
                    </div>
                </div>
            `;

            // Punto 6: Clic en tarjeta activa selección y sincroniza mapa
            card.addEventListener('click', () => {
                activarSismo(sismo, card, circulo, true);
            });

            // Punto 6: Clic en marcador en mapa activa tarjeta en la lista
            circulo.on('click', () => {
                activarSismo(sismo, card, circulo, false);
            });

            contenedorLista.appendChild(card);

            // Si coincide con el seleccionado o es el primero por defecto
            if (index === 0 && !sismoSeleccionadoId) {
                card.classList.add('sismo-activa');
                tarjetaActivaElemento = card;
            } else if (sismo.id === sismoSeleccionadoId) {
                card.classList.add('sismo-activa');
                tarjetaActivaElemento = card;
            }
        });
    }

    window.recargarSismosManualmente = function() {
        mostrarEsqueletosCarga();
        cargarSismos();
    };

    // Carga inicial y refresco cada 2 minutos
    mostrarEsqueletosCarga();
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
        } else if (juego === 'simulador') {
            juegoSimulador.classList.remove('oculto');
            iniciarSimulador();
        }
    };

    window.volverSelector = function() {
        juegoBotiquin.classList.add('oculto');
        juegoSimulador.classList.add('oculto');
        selectorJuegos.classList.remove('oculto');
        clearInterval(intervaloTemporizador); // Detiene el temporizador al salir
        juegoActivo = false;
        simuladorActivo = false;
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


    // ==========================================
    // 7. JUEGO: SISMO SIMULATOR (¿QUÉ HARÍAS?)
    // Trivias de toma de decisiones - Aprender fallando
    // ==========================================
    const juegoSimulador = document.getElementById('juego-simulador');
    const progresoSimulador = document.getElementById('progreso-simulador');
    const progresoBarraFill = document.getElementById('progreso-barra-fill');
    const tarjetaEscenario = document.getElementById('tarjeta-escenario');
    const escenarioIcono = document.getElementById('escenario-icono');
    const escenarioTexto = document.getElementById('escenario-texto');
    const opcionesContainer = document.getElementById('opciones-container');
    const feedbackSimulador = document.getElementById('feedback-simulador');

    const escenariosPorRonda = 6;
    let rondaEscenarios = [];
    let indiceEscenario = 0;
    let erroresEscenario = 0;
    let aciertosPrimera = 0;
    let aprendidosFallando = 0;
    let simuladorActivo = false;

    // Banco de escenarios (extraídos de la Guía de Supervivencia)
    const bancoEscenarios = [
        {
            icono: '🏠',
            contexto: 'Vives en un quinto piso. Tienes una biblioteca alta y pesada junto al sofá donde todos ven televisión.',
            opciones: [
                { texto: 'Anclarla a la pared con esquineros metálicos o correas de seguridad', correcta: true,
                  feedback: 'Correcto: los muebles altos sin anclar son de las principales causas de lesión en sismos. Un anclaje simple evita que vuelque sobre quien esté sentado.' },
                { texto: 'Ponerle más libros en la parte baja para que pese más y no se mueva', correcta: false,
                  feedback: 'Aumentar el peso no evita que vuelque; al contrario, la hace más peligrosa si cae. Lo correcto es anclarla firmemente a la pared.' },
                { texto: 'Moverla unos centímetros lejos del sofá y listo', correcta: false,
                  feedback: 'Distanciarla no es suficiente: durante un sismo fuerte la biblioteca puede deslizarse o volcarse. Debe quedar anclada a la pared.' }
            ]
        },
        {
            icono: '📋',
            contexto: 'Tu familia quiere organizarse para un posible sismo. Solo pueden hacer UNA cosa este fin de semana. ¿Cuál tiene prioridad?',
            opciones: [
                { texto: 'Definir roles, puntos de encuentro y hacer un simulacro de evacuación', correcta: true,
                  feedback: 'El plan familiar es la base de todo: saber quién cierra el gas, dónde se reúnen y practicar la ruta vale más que cualquier objeto.' },
                { texto: 'Comprar velas y fósforos para cuando se vaya la luz', correcta: false,
                  feedback: 'Las velas son un riesgo de incendio tras un sismo por las posibles fugas de gas. Prioriza el plan y la mochila; para luz, usa linternas.' },
                { texto: 'Guardar dinero en efectivo en un cajón', correcta: false,
                  feedback: 'El dinero no salva vidas en las primeras 72 horas. El plan de evacuación y la mochila de emergencia son la verdadera prioridad.' }
            ]
        },
        {
            icono: '🎒',
            contexto: 'Estás armando la mochila de emergencia de 72 horas. ¿Cuál de estos tres juegos de objetos es el correcto?',
            opciones: [
                { texto: 'Agua, radio AM/FM, linterna, botiquín y documentos protegidos', correcta: true,
                  feedback: 'Justo lo esencial: hidratación, información, luz, primeros auxilios e identificación. Con eso sobrevives las primeras 72 horas.' },
                { texto: 'Laptop, secador de cabello y cargadores de todo tipo', correcta: false,
                  feedback: 'Sin electricidad ni internet, estos objetos son peso muerto. La mochila debe cubrir necesidades básicas, no comodidades.' },
                { texto: 'Joyas, dinero en efectivo y ropa de marca', correcta: false,
                  feedback: 'Los objetos de valor no sirven de nada los primeros días. Prioriza agua, comida no perecedera, luz e insumos médicos.' }
            ]
        },
        {
            icono: '🏢',
            contexto: 'Estás en tu apartamento del piso 8. La tierra empieza a temblar fuerte y estás cerca de la ventana.',
            opciones: [
                { texto: 'Correr hacia las escaleras para evacuar cuanto antes', correcta: false,
                  feedback: 'Las escaleras pueden colapsar o generar estampidas durante el movimiento. Nunca evacúes mientras la tierra tiembla.' },
                { texto: 'Agacharme, cubrirme y sujetarme bajo la mesa, lejos de la ventana', correcta: true,
                  feedback: 'La regla de oro: protégete bajo una estructura firme, aléjate de vidrios y sujétate hasta que el movimiento cese.' },
                { texto: 'Quedarme junto a la ventana para ver qué pasa en la calle', correcta: false,
                  feedback: 'Los vidrios se astillan violentamente en un sismo. Aléjate de ventanas y fachadas y busca refugio bajo una mesa resistente.' }
            ]
        },
        {
            icono: '🚗',
            contexto: 'Vas manejando por una avenida cuando empieza el sismo. Justo delante hay un puente peatonal.',
            opciones: [
                { texto: 'Acelerar para cruzar rápido debajo del puente', correcta: false,
                  feedback: 'Los puentes y estructuras elevadas pueden sufrir daños o colapsar. Acelerar hacia el peligro es lo contrario de lo que debes hacer.' },
                { texto: 'Reducir poco a poco, orillarme lejos del puente y permanecer en el carro', correcta: true,
                  feedback: 'Orillarte en zona abierta, lejos de puentes, postes y cables, y quedarte dentro del vehículo con las intermitentes encendidas es lo seguro.' },
                { texto: 'Frenar de golpe en medio de la vía y bajar corriendo', correcta: false,
                  feedback: 'Frenar bruscamente puede provocar un choque, y las fachadas y cables cercanos son un peligro para el peatón. Mejor orilla con calma.' }
            ]
        },
        {
            icono: '🏬',
            contexto: 'Estás en el 4to piso de un centro comercial lleno de gente. Empieza un sismo fuerte y todos corren hacia las salidas.',
            opciones: [
                { texto: 'Unirme a la carrera hacia la salida más cercana', correcta: false,
                  feedback: 'Las estampidas causan más lesiones que el sismo mismo. No corras hacia salidas masivas mientras la tierra se mueve.' },
                { texto: 'Cubrirme junto a un mostrador firme o bajo una estructura sólida', correcta: true,
                  feedback: 'Protégete la cabeza junto a mostradores o columnas estructurales y espera a que cese el movimiento antes de evacuar con calma.' },
                { texto: 'Meterme al ascensor para bajar más rápido que todos', correcta: false,
                  feedback: 'Los ascensores pueden fallar por cortes eléctricos y dejarte atrapado. Nunca uses ascensores durante un sismo.' }
            ]
        },
        {
            icono: '🏫',
            contexto: 'Eres profesor y tus estudiantes están en clase cuando suena la alerta y empieza a temblar.',
            opciones: [
                { texto: 'Ordenar a todos que corran al patio en fila', correcta: false,
                  feedback: 'Correr mientras tiembla causa caídas y golpes. La evacuación se hace cuando el movimiento ya cesó.' },
                { texto: 'Que se coloquen bajo los pupitres, cabeza entre las rodillas, sujetando las patas', correcta: true,
                  feedback: 'Bajo el pupitre, cubiertos y sujetados, los estudiantes quedan protegidos de objetos que caen. Luego se evacúa en orden.' },
                { texto: 'Que se parén en los marcos de las puertas', correcta: false,
                  feedback: 'El refugio en marcos de puerta es un mito superado; las puertas modernas no son más seguras. El pupitre resistente es la protección real.' }
            ]
        },
        {
            icono: '🛏️',
            contexto: 'El sismo te despierta de madrugada. Estás en la cama, en el segundo piso de tu casa.',
            opciones: [
                { texto: 'Saltar de la cama y correr hacia la puerta', correcta: false,
                  feedback: 'Correr en la oscuridad con el piso moviéndose causa caídas, y las escaleras son peligrosas durante el sismo.' },
                { texto: 'Quedarme en la cama, cubrirme la cabeza con la almohada y alejarme de la ventana', correcta: true,
                  feedback: 'Si estás en la cama, quedarte en ella y protegerte la cabeza con la almohada es seguro; el marco de la cama ofrece cierta protección.' },
                { texto: 'Refugiarme debajo del mueble del televisor', correcta: false,
                  feedback: 'Los muebles altos y el televisor pueden caer justo donde te refugias. Mejor la cama, la almohada y lejos de la ventana.' }
            ]
        },
        {
            icono: '🔥',
            contexto: 'Tras el sismo, al revisar tu casa hueles fuerte a gas y escuchas un leve silbido.',
            opciones: [
                { texto: 'Encender la luz del celular y buscar la fuga', correcta: false,
                  feedback: '¡Peligro! Cualquier chispa eléctrica puede detonar el gas acumulado. No acciones interruptores ni enciendas nada.' },
                { texto: 'Abrir puertas si es posible, sin accionar interruptores, y evacuar', correcta: true,
                  feedback: 'Ventilar sin generar chispas y evacuar es lo correcto. Reporta la fuga desde afuera y espera a los servicios de emergencia.' },
                { texto: 'Encender un fósforo para ver dónde está la fuga', correcta: false,
                  feedback: 'Encender fuego cerca de una fuga de gas es una explosión garantizada. Nunca uses llamas ni interruptores cerca del gas.' }
            ]
        },
        {
            icono: '📱',
            contexto: 'El sismo pasó y las redes están saturadas. Tu familia está en otra ciudad y está muy preocupada.',
            opciones: [
                { texto: 'Llamarlas insistiendo hasta lograr comunicación', correcta: false,
                  feedback: 'Las llamadas de voz colapsan las redes de emergencia. Los mensajes usan pocos datos y llegan antes.' },
                { texto: 'Enviarles un SMS o mensaje corto por WhatsApp con mi estado y ubicación', correcta: true,
                  feedback: 'Los mensajes de texto priorizan la red y dejan líneas libres para los organismos de socorro. Informa con fuentes oficiales, no rumores.' },
                { texto: 'Publicar lo que me cuentan en redes y esperar confirmaciones', correcta: false,
                  feedback: 'Las cadenas no verificadas generan pánico. Comunícate directo con tu familia por mensaje y consulta solo fuentes oficiales.' }
            ]
        },
        {
            icono: '🔍',
            contexto: 'Al revisar tu edificio ves una grieta diagonal de 45° cruzando una columna estructural.',
            opciones: [
                { texto: 'Taparla con cemento y seguir con normalidad', correcta: false,
                  feedback: 'Ocultar una grieta estructural no la repara: la columna pudo perder capacidad de carga. Debes reportarla.' },
                { texto: 'Evacuar el inmueble y reportar el daño a las autoridades', correcta: true,
                  feedback: 'Las grietas diagonales en columnas o muros de carga indican daño estructural severo. Evacúa y espera la evaluación oficial.' },
                { texto: 'Ignorarla: siempre se forman grietas en el pañete', correcta: false,
                  feedback: 'Las fisuras del pañete son superficiales, pero una grieta diagonal en la estructura es otra cosa. No la subestimes.' }
            ]
        },
        {
            icono: '🌊',
            contexto: 'Pasó el sismo principal y quieres volver a tu casa por tus documentos. Las autoridades aún no han dado el visto bueno.',
            opciones: [
                { texto: 'Volver rápido antes de que lleguen más réplicas', correcta: false,
                  feedback: 'Las réplicas pueden ser tan destructivas como el sismo original, especialmente en el Nido Sísmico. Espera el aval oficial.' },
                { texto: 'Permanecer en el punto de encuentro hasta que las autoridades declaren la zona segura', correcta: true,
                  feedback: 'En Santander las réplicas son frecuentes. La paciencia en el punto de encuentro te protege de derrumbes posteriores.' },
                { texto: 'Subir solo un momento por el ascensor', correcta: false,
                  feedback: 'El edificio pudo quedar comprometido y los ascensores son de los primeros sistemas en fallar. No reingreses sin autorización.' }
            ]
        },
        {
            icono: '🐾',
            contexto: 'Tu perro se asusta durante el sismo y tiembla escondido debajo de la cama.',
            opciones: [
                { texto: 'Sacarlo a la fuerza para llevarlo conmigo', correcta: false,
                  feedback: 'Un animal asustado puede morder incluso a su dueño. Forzarlo pone en riesgo a ambos.' },
                { texto: 'Dejarlo refugiarse y tener listo su kit con correa, comida y carné de vacunación', correcta: true,
                  feedback: 'Los animales buscan refugio instintivamente. Ten preparado su kit y acércate con calma cuando el ambiente esté tranquilo.' },
                { texto: 'Ignorarlo: las mascotas se defienden solas', correcta: false,
                  feedback: 'Las mascotas también necesitan plan: kit de 3 días, placa de identificación y transporte seguro.' }
            ]
        },
        {
            icono: '♿',
            contexto: 'Usas silla de ruedas y estás en casa cuando empieza a temblar.',
            opciones: [
                { texto: 'Intentar bajar solo por las escaleras antes de que empeore', correcta: false,
                  feedback: 'Las escaleras durante un sismo son una trampa mortal, y moverse durante el movimiento multiplica el riesgo de caída.' },
                { texto: 'Frenar las ruedas, agacharme lo más posible y cubrirme la cabeza con un cojín', correcta: true,
                  feedback: 'Con la silla frenada y el cuerpo agachado y cubierto, reduces el riesgo de vuelco y de golpes por objetos que caen.' },
                { texto: 'Pedirle a alguien que me cargue corriendo escaleras abajo', correcta: false,
                  feedback: 'Mover a una persona durante el movimiento fuerte puede lesionar a ambos. Espera a que cese y evacúa con ayuda por la ruta segura.' }
            ]
        }
    ];

    function iniciarSimulador() {
        simuladorActivo = true;
        rondaEscenarios = mezclarArreglo([...bancoEscenarios]).slice(0, escenariosPorRonda);
        indiceEscenario = 0;
        aciertosPrimera = 0;
        aprendidosFallando = 0;
        mostrarEscenario();
    }

    function mostrarEscenario() {
        const esc = rondaEscenarios[indiceEscenario];
        erroresEscenario = 0;
        escenarioIcono.innerText = esc.icono;
        escenarioTexto.innerText = esc.contexto;
        progresoSimulador.innerText = `Escenario ${indiceEscenario + 1} / ${escenariosPorRonda}`;
        progresoBarraFill.style.width = `${(indiceEscenario / escenariosPorRonda) * 100}%`;
        tarjetaEscenario.classList.remove('error-activo', 'acierto-activo');
        feedbackSimulador.className = 'feedback-simulador oculto';
        feedbackSimulador.innerHTML = '';
        opcionesContainer.innerHTML = '';

        mezclarArreglo([...esc.opciones]).forEach(op => {
            const btn = document.createElement('button');
            btn.className = 'opcion-btn';
            btn.innerText = op.texto;
            btn._opcion = op; // Referencia para revelar la correcta después de 2 fallos
            btn.addEventListener('click', () => seleccionarOpcion(btn, op));
            opcionesContainer.appendChild(btn);
        });
    }

    function seleccionarOpcion(boton, opcion) {
        if (!simuladorActivo) return;
        const esPrimerIntento = erroresEscenario === 0;

        if (opcion.correcta) {
            if (esPrimerIntento) aciertosPrimera++; else aprendidosFallando++;
            boton.classList.add('opcion-correcta');
            deshabilitarOpciones();
            tarjetaEscenario.classList.add('acierto-activo');
            mostrarFeedback(opcion.feedback, true, 'Siguiente escenario ➜', false);
        } else {
            erroresEscenario++;
            boton.classList.add('opcion-erronea');
            boton.disabled = true;
            tarjetaEscenario.classList.add('error-activo');
            setTimeout(() => tarjetaEscenario.classList.remove('error-activo'), 600);

            if (erroresEscenario >= 2) {
                // Segundo fallo: se revela la correcta y se avanza (aprender fallando, sin frustración eterna)
                const opCorrecta = rondaEscenarios[indiceEscenario].opciones.find(o => o.correcta);
                [...opcionesContainer.children].forEach(b => {
                    if (b._opcion === opCorrecta) b.classList.add('opcion-correcta');
                    b.disabled = true;
                });
                mostrarFeedback(`${opcion.feedback} La decisión correcta era: ${opCorrecta.feedback}`, false, 'Continuar ➜', false);
            } else {
                mostrarFeedback(opcion.feedback, false, '🔄 Intentar de nuevo', true);
            }
        }
    }

    function deshabilitarOpciones() {
        [...opcionesContainer.children].forEach(b => b.disabled = true);
    }

    function mostrarFeedback(texto, esOk, labelBoton, esReintento) {
        feedbackSimulador.className = `feedback-simulador ${esOk ? 'feedback-ok' : 'feedback-mal'}`;
        feedbackSimulador.innerHTML = '';

        const p = document.createElement('p');
        p.innerText = (esOk ? '✅ ' : '❌ ') + texto;
        feedbackSimulador.appendChild(p);

        const btn = document.createElement('button');
        btn.className = 'btn ' + (esOk ? 'btn-secondary' : 'btn-primary');
        btn.innerText = labelBoton;
        btn.addEventListener('click', () => {
            if (esReintento) {
                // Se rehabilitan las opciones que no han fallado
                feedbackSimulador.className = 'feedback-simulador oculto';
                [...opcionesContainer.children].forEach(b => {
                    if (!b.classList.contains('opcion-erronea')) b.disabled = false;
                });
            } else {
                indiceEscenario++;
                if (indiceEscenario >= escenariosPorRonda) finalizarSimulador();
                else mostrarEscenario();
            }
        });
        feedbackSimulador.appendChild(btn);
    }

    function finalizarSimulador() {
        simuladorActivo = false;
        progresoBarraFill.style.width = '100%';
        mostrarModalJuego(
            '¡Simulación completada!',
            `Acertaste ${aciertosPrimera} de ${escenariosPorRonda} decisiones a la primera, y aprendiste ${aprendidosFallando} lección(es) la vieja usanza: fallando. Cada error de hoy es un acierto en la vida real.`,
            '🧠',
            iniciarSimulador
        );
    }
});

// LÓGICA DE NAVEGACIÓN POR PESTAÑAS EN LA GUÍA DE SUPERVIVENCIA
window.mostrarFase = function(faseId) {
    // Ocultar todos los contenidos de las fases
    const fases = document.querySelectorAll('.fase-contenido');
    fases.forEach(fase => fase.classList.remove('activa'));

    // Quitar la clase active de todos los botones
    const botones = document.querySelectorAll('.tab-btn');
    botones.forEach(btn => btn.classList.remove('active'));

    // Mostrar la fase seleccionada
    const faseSeleccionada = document.getElementById(faseId);
    if (faseSeleccionada) {
        faseSeleccionada.classList.add('activa');
        if (typeof window.animarTarjetasFase === 'function') {
            window.animarTarjetasFase(faseSeleccionada);
        }
    }

    // Marcar el botón presionado como activo
    const evt = window.event || event;
    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.add('active');
    } else {
        const botonActivo = document.querySelector(`.tab-btn[onclick*="${faseId}"]`);
        if (botonActivo) botonActivo.classList.add('active');
    }
};
