// Navegación suave
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Manejo del formulario de encuesta
const surveyForm = document.querySelector('.survey-form');
if (surveyForm) {
    surveyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const responses = {};
        
        for (let [key, value] of formData.entries()) {
            responses[key] = value;
        }
        
        // Verificar que todas las preguntas estén respondidas
        const requiredFields = ['kit', 'simulacro', 'zonas'];
        const allAnswered = requiredFields.every(field => responses[field]);
        
        if (!allAnswered) {
            alert('Por favor responde todas las preguntas antes de enviar.');
            return;
        }
        
        // Simular envío de datos
        console.log('Respuestas de la encuesta:', responses);
        
        // Mostrar mensaje de confirmación
        const confirmMessage = document.createElement('div');
        confirmMessage.className = 'success-message';
        confirmMessage.style.cssText = `
            background: #10b981;
            color: white;
            padding: 1rem;
            border-radius: 8px;
            margin-top: 1rem;
            text-align: center;
            animation: fadeInUp 0.5s ease;
        `;
        confirmMessage.textContent = '¡Gracias por tu participación! Tus respuestas han sido registradas.';
        
        // Remover mensaje anterior si existe
        const existingMessage = surveyForm.querySelector('.success-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        surveyForm.appendChild(confirmMessage);
        
        // Resetear formulario
        this.reset();
        
        // Remover mensaje después de 5 segundos
        setTimeout(() => {
            confirmMessage.remove();
        }, 5000);
    });
}

// Animación de aparición al hacer scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '0';
            entry.target.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                entry.target.style.transition = 'all 0.6s ease';
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, 100);
            
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observar elementos para animación
document.querySelectorAll('.card, .content-card, .tip-card, .contact-card, .video-card').forEach(el => {
    observer.observe(el);
});

// Cambiar color del navbar al hacer scroll
let lastScroll = 0;
const navbar = document.querySelector('header');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.15)';
    } else {
        navbar.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    }
    
    lastScroll = currentScroll;
});

// Agregar efecto de ripple a los botones
document.querySelectorAll('.cta-button, .submit-button').forEach(button => {
    button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple-effect 0.6s ease-out;
            pointer-events: none;
        `;
        
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    });
});

// Agregar estilos de animación para el ripple
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple-effect {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Mostrar un toast con consejos aleatorios
const tips = [
    "Recuerda: Agáchate, Cúbrete y Agárrate durante un terremoto",
    "Ten siempre listo un kit de emergencia con agua y alimentos",
    "Identifica las zonas seguras de tu hogar",
    "Participa en simulacros regularmente",
    "Mantén los números de emergencia a la mano"
];

function showRandomTip() {
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    const toast = document.createElement('div');
    
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #2563eb, #1e40af);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        max-width: 350px;
        animation: slideInRight 0.5s ease;
    `;
    
    toast.innerHTML = `
        <strong>💡 Consejo:</strong> ${randomTip}
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(() => toast.remove(), 500);
    }, 6000);
}

// Agregar animaciones de slide
const slideStyle = document.createElement('style');
slideStyle.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(slideStyle);

// Mostrar consejo después de 10 segundos
setTimeout(showRandomTip, 10000);
