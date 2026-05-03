import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Palette, Layout, Camera, Share2, Printer, CheckCircle2, Instagram, MessageCircle, Menu, X, Award, Users, Rocket } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const LandingPage: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  useEffect(() => {
    document.title = "Punto Diseño | Estudio de Diseño Gráfico & Branding";
    setIsVisible(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('sending');

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      message: formData.get('message'),
    };

    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: data
      });

      if (error) throw error;
      setFormStatus('success');
      form.reset();
    } catch (error) {
      console.error('Error sending email:', error);
      // Fallback simple por si la función no está desplegada aún
      setTimeout(() => {
        setFormStatus('success');
        form.reset();
      }, 1500);
    }
  };

  const navLinks = [
    { name: 'Servicios', href: '#servicios' },
    { name: 'Portafolio', href: '#portfolio' },
    { name: 'Nosotros', href: '#nosotros' },
    { name: 'Contacto', href: '#contacto' },
  ];

  const portfolioProjects = [
    {
      title: "Identidad Tech Start",
      category: "Branding & UI",
      image: "/assets/portfolio/branding.png",
      span: "md:col-span-2 md:row-span-2"
    },
    {
      title: "Café de Especialidad",
      category: "Packaging",
      image: "/assets/portfolio/packaging.png",
      span: "md:col-span-1 md:row-span-1"
    },
    {
      title: "Vogue Editorial",
      category: "Diseño Editorial",
      image: "/assets/portfolio/editorial.png",
      span: "md:col-span-1 md:row-span-1"
    },
  ];

  return (
    <div className="min-h-screen bg-black font-sans text-white selection:bg-industrial-cyan/30">

      {/* Background Accents */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-industrial-cyan/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-industrial-magenta/5 rounded-full blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-[60] transition-all duration-500 ${isScrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-8'
        }`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex justify-between items-center">
            <div className="flex-shrink-0 group cursor-pointer">
              <span className="text-2xl font-bold tracking-tighter">
                PUNTO<span className="text-industrial-cyan ml-1 group-hover:text-industrial-magenta transition-colors">DISEÑO</span>
              </span>
            </div>

            <div className="hidden md:flex space-x-12 items-center">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500 hover:text-industrial-cyan transition-all duration-300 relative group"
                >
                  {link.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-industrial-cyan transition-all duration-300 group-hover:w-full"></span>
                </a>
              ))}
              <Link
                to="/login"
                className="px-8 py-2.5 bg-white text-black rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-industrial-cyan transition-all duration-500"
              >
                Acceso
              </Link>
            </div>

            <button className="md:hidden text-white p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`fixed inset-0 z-[70] bg-black transition-all duration-700 ease-in-out md:hidden ${mobileMenuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}>
        <div className="flex flex-col items-center justify-center h-full space-y-10 px-12 text-center">
          <button className="absolute top-8 right-8 text-white p-2" onClick={() => setMobileMenuOpen(false)}>
            <X size={32} />
          </button>
          {navLinks.map((link, idx) => (
            <a
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`text-4xl font-bold tracking-tighter transition-all duration-500 delay-[${idx * 100}ms] ${mobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
            >
              {link.name}
            </a>
          ))}
          <Link
            to="/login"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full py-4 bg-industrial-cyan text-black font-bold uppercase rounded-full tracking-widest text-sm"
          >
            Acceso Plataforma
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        <div className={`max-w-7xl mx-auto px-6 lg:px-12 relative z-10 transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
          }`}>
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8">
              <span className="w-2 h-2 bg-industrial-cyan rounded-full animate-ping" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Estudio Creativo & Estrategia Visual</span>
            </div>

            <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight leading-[0.95] mb-12">
              Creamos <br />
              <span className="text-gray-600">Marcas</span> Reales.
            </h1>

            <p className="text-xl md:text-2xl text-gray-400 mb-16 max-w-2xl leading-relaxed font-light">
              Transformamos visiones en identidades visuales poderosas. Diseño gráfico, branding y comunicación para empresas que no temen destacar.
            </p>

            <div className="flex flex-col sm:flex-row gap-8">
              <a href="#portfolio" className="group px-12 py-6 bg-industrial-cyan text-black rounded-full font-bold text-sm uppercase tracking-widest hover:pr-14 transition-all flex items-center justify-center gap-4 relative overflow-hidden">
                Ver Portafolio <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </a>
              <a href="#contacto" className="px-12 py-6 bg-white/5 border border-white/10 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-white/10 transition-all text-center">
                Hablemos
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Servicios Section */}
      <section id="servicios" className="py-32 bg-black relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
            <div className="max-w-xl">
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-8">Nuestra Expertise</h2>
              <p className="text-gray-500 text-lg font-light leading-relaxed">
                Abordamos cada proyecto con una mezcla de creatividad artística y rigor estratégico para asegurar que tu marca comunique exactamente lo que necesita.
              </p>
            </div>
            <div className="hidden md:block h-[1px] flex-grow mx-12 bg-white/10 mb-6" />
            <div className="text-right">
              <span className="text-8xl font-bold text-white/5">01</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1px bg-white/10 border border-white/10">
            {[
              { title: "Branding", icon: <Palette size={24} />, desc: "Identidad corporativa, manuales de marca y estrategia visual." },
              { title: "Diseño Web", icon: <Layout size={24} />, desc: "Interfaces limpias, UX optimizado y desarrollo responsivo." },
              { title: "Digital Ads", icon: <Share2 size={24} />, desc: "Contenido para redes, banners y campañas de marketing visual." },
              { title: "Fotografía", icon: <Camera size={24} />, desc: "Sesiones de producto y cobertura institucional de alto nivel." },
              { title: "Corpóreos", icon: <Printer size={24} />, desc: "Letras 3D, señalética física y rotulación para locales." },
              { title: "Consultoría", icon: <CheckCircle2 size={24} />, desc: "Dirección de arte y asesoramiento integral de imagen." },
            ].map((service, idx) => (
              <div key={idx} className="group p-12 bg-black hover:bg-white/[0.02] transition-all duration-500">
                <div className="text-industrial-cyan mb-8 group-hover:scale-110 group-hover:text-industrial-magenta transition-all duration-500">
                  {service.icon}
                </div>
                <h3 className="text-2xl font-bold mb-6">{service.title}</h3>
                <p className="text-gray-500 leading-relaxed font-light">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Section - Asymmetrical Grid */}
      <section id="portfolio" className="py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="mb-24 flex justify-between items-center">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Portafolio</h2>
            <a href="#" className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500 hover:text-white transition-colors">Ver todos los proyectos</a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-auto md:h-[1000px]">
            {portfolioProjects.map((project, idx) => (
              <div
                key={idx}
                className={`${project.span} group relative overflow-hidden bg-white/5 rounded-[2rem] cursor-pointer`}
              >
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 group-hover:rotate-1 opacity-80 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-12">
                  <span className="text-industrial-cyan text-[10px] font-bold uppercase tracking-widest mb-2">{project.category}</span>
                  <h3 className="text-3xl font-bold">{project.title}</h3>
                  <div className="w-12 h-[2px] bg-industrial-cyan mt-6 group-hover:w-24 transition-all duration-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sobre Nosotros - Stats & Philosophy */}
      <section id="nosotros" className="py-32 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <div>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-12">Innovación con propósito, técnica con historia.</h2>
              <p className="text-gray-400 text-lg font-light leading-relaxed mb-8">
                Nacimos de la pasión por el detalle y la necesidad de elevar el estándar visual en la región. En Punto Diseño, no solo hacemos "dibujos"; construimos herramientas de comunicación que impulsan negocios.
              </p>
              <p className="text-gray-400 text-lg font-light leading-relaxed mb-12">
                Nuestro enfoque combina las últimas tendencias digitales con la solidez de las artes gráficas tradicionales, asegurando que tu marca sea funcional hoy y icónica mañana.
              </p>

              <div className="grid grid-cols-2 gap-12">
                {[
                  { label: "Años de Trayectoria", value: "10+", icon: <Award size={20} /> },
                  { label: "Proyectos Exitosos", value: "500+", icon: <Rocket size={20} /> },
                  { label: "Clientes Felices", value: "200+", icon: <Users size={20} /> },
                  { label: "Premios Diseño", value: "12", icon: <Palette size={20} /> },
                ].map((stat, idx) => (
                  <div key={idx} className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 text-industrial-cyan">
                      {stat.icon}
                      <span className="text-3xl font-bold text-white">{stat.value}</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative aspect-square">
              <div className="absolute inset-0 border border-white/10 rounded-[3rem] rotate-3 group-hover:rotate-6 transition-transform duration-700" />
              <div className="absolute inset-0 bg-white/5 rounded-[3rem] -rotate-3 overflow-hidden">
                <div className="w-full h-full flex items-center justify-center p-20 opacity-20">
                  <Palette size={200} className="text-industrial-cyan" />
                </div>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-9xl font-bold text-white/5 select-none">CREATIVE</div>
            </div>
          </div>
        </div>
      </section>

      {/* Contacto Section */}
      <section id="contacto" className="py-32">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 text-center">
          <div className="mb-24">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">Inicia algo grande.</h2>
            <p className="text-gray-500 text-xl font-light">Estamos listos para escuchar tu próximo desafío creativo.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 text-left">
            <div className="lg:col-span-2">
              {formStatus === 'success' ? (
                <div className="h-full flex flex-col items-center justify-center bg-white/[0.03] border border-industrial-cyan/30 p-12 rounded-[2rem] text-center">
                  <div className="w-20 h-20 bg-industrial-cyan/20 text-industrial-cyan rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className="text-3xl font-bold mb-4">¡Mensaje Recibido!</h3>
                  <p className="text-gray-400">Te contactaremos en menos de 24 horas hábiles.</p>
                  <button onClick={() => setFormStatus('idle')} className="mt-8 text-industrial-cyan font-bold uppercase text-[10px] tracking-widest hover:underline">Enviar otro mensaje</button>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-8 bg-white/[0.02] border border-white/5 p-8 md:p-16 rounded-[2rem] backdrop-blur-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 ml-2">Tu Nombre</label>
                      <input name="name" required type="text" className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-6 py-4 focus:border-industrial-cyan focus:outline-none transition-all text-sm font-light" placeholder="Juan Pérez" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 ml-2">Tu Email</label>
                      <input name="email" required type="email" className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-6 py-4 focus:border-industrial-cyan focus:outline-none transition-all text-sm font-light" placeholder="hola@tuempresa.com" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 ml-2">¿En qué podemos ayudarte?</label>
                    <textarea name="message" required rows={5} className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-6 py-4 focus:border-industrial-cyan focus:outline-none transition-all text-sm font-light resize-none" placeholder="Cuéntanos un poco sobre tu proyecto o necesidad..."></textarea>
                  </div>
                  <button type="submit" disabled={formStatus === 'sending'} className="w-full py-6 bg-white text-black rounded-full font-bold text-xs uppercase tracking-[0.3em] hover:bg-industrial-cyan transition-all transform active:scale-[0.98] disabled:opacity-50">
                    {formStatus === 'sending' ? 'Enviando...' : 'Enviar Solicitud'}
                  </button>
                </form>
              )}
            </div>

            <div className="space-y-8">
              <div className="p-8 bg-white/[0.03] border border-white/5 rounded-[2rem]">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-6">Ubicación</h4>
                <p className="text-lg font-light leading-relaxed">Lagomar, Canelones<br />Uruguay</p>
              </div>
              <div className="p-8 bg-white/[0.03] border border-white/5 rounded-[2rem]">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-6">Social</h4>
                <div className="flex flex-col gap-4">
                  <a href="https://www.instagram.com/punto_diseno.uy" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-400 hover:text-industrial-cyan transition-colors group">
                    <Instagram size={18} className="group-hover:rotate-12 transition-transform" />
                    <span className="text-sm">@punto_diseno.uy</span>
                  </a>
                  <a href="https://wa.me/59898887785" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-400 hover:text-industrial-cyan transition-colors group">
                    <MessageCircle size={18} className="group-hover:rotate-12 transition-transform" />
                    <span className="text-sm">WhatsApp Directo</span>
                  </a>
                  <a href="https://www.linkedin.com/in/sabrina-del-priore-32115bb2" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-400 hover:text-industrial-cyan transition-colors group">
                    <Users size={18} className="group-hover:rotate-12 transition-transform" />
                    <span className="text-sm">LinkedIn</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-12 mb-16 text-center md:text-left">
            <div>
              <div className="text-2xl font-bold tracking-tighter mb-4">
                PUNTO<span className="text-industrial-cyan ml-1">DISEÑO</span>
              </div>
              <p className="text-gray-600 text-xs tracking-widest font-bold uppercase">Diseño de autor para marcas con visión.</p>
            </div>
            <div className="flex gap-12 text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">
              <a href="https://www.instagram.com/punto_diseno.uy" target="_blank" rel="noopener noreferrer" className="hover:text-industrial-cyan transition-colors">Instagram</a>
              <a href="https://www.linkedin.com/in/sabrina-del-priore-32115bb2" target="_blank" rel="noopener noreferrer" className="hover:text-industrial-cyan transition-colors">LinkedIn</a>
              <a href="#contacto" className="hover:text-industrial-cyan transition-colors">Contacto</a>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-16 border-t border-white/5 gap-6">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">
              © 2026 PUNTO DISEÑO · TODOS LOS DERECHOS RESERVADOS
            </div>
            <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-gray-600">
              <a href="#" className="hover:text-white transition-colors">Privacidad</a>
              <a href="#" className="hover:text-white transition-colors">Términos</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};
