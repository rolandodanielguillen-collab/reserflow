/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Instagram, 
  Send, 
  Smartphone, 
  Sparkles, 
  Image as ImageIcon, 
  RefreshCcw, 
  ChevronLeft, 
  ChevronRight, 
  Type,
  CheckCircle2,
  Clock,
  Zap
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// Colors from Logo
const COLORS = {
  navy: '#041E42',
  teal: '#00A572',
  white: '#FFFFFF',
  paleTeal: '#E6F4F0',
};

interface Slide {
  id: number;
  title: string;
  subtitle: string;
  imagePrompt?: string;
  imageUrl?: string;
}

const DEFAULT_SLIDES: Slide[] = [
  {
    id: 1,
    title: "¿PARTIDO HOY?",
    subtitle: "Reserva tu cancha en segundos por WhatsApp.",
    imagePrompt: "A high-quality action photo of a modern padel or soccer court at sunset, vibrant lighting, professional look."
  },
  {
    id: 2,
    title: "SIN APPS. SIN REGISTROS.",
    subtitle: "Solo guarda nuestro número y empieza a reservar.",
    imagePrompt: "A close up of a person holding a smartphone showing a WhatsApp chat with sport icons, clean and minimal background."
  },
  {
    id: 3,
    title: "AMENITIES Y MÁS",
    subtitle: "Canchas, parrillas y salones. Todo en un solo lugar.",
    imagePrompt: "Luxury sports club amenities, swimming pool and tennis courts, modern architecture, bright daylight."
  }
];

interface ScheduledPost {
  week: number;
  postNumber: number;
  concept: string;
  slogan: string;
  detail: string;
}

export default function App() {
  const [slides, setSlides] = useState<Slide[]>([
    {
      id: 1,
      title: "RESERVÁ TU CANCHA EN SEGUNDOS ⚡",
      subtitle: "La forma más rápida de asegurar tu lugar sin perder tiempo.",
      imagePrompt: "High quality photo of a person using a smartphone with a clean WhatsApp chat interface visible, navy and teal branding, modern professional lighting."
    },
    {
      id: 2,
      title: "¿CANSADO DE LLAMAR O ESPERAR? 🕒",
      subtitle: "Olvídate de las llamadas eternas y las confirmaciones que nunca llegan.",
      imagePrompt: "Close up of an old analog clock and a person looking frustrated with a classic phone, cinematic lighting, minimalist professional style."
    },
    {
      id: 3,
      title: "RESERVÁ DIRECTO POR WHATSAPP 📲",
      subtitle: "Sin descargar nada. Todo sucede en tu chat de confianza.",
      imagePrompt: "A professional smartphone mockup showing a clean WhatsApp booking conversation for a tennis court, teal confirm buttons, navy headers."
    },
    {
      id: 4,
      title: "SIN APPS. SIN COMPLICACIONES. 🚫",
      subtitle: "No ocupes espacio en tu celular. Reser+ vive donde vos ya estás.",
      imagePrompt: "Minimalist graphic comparison: a cluttered mobile app folder with an 'X' over it versus a clean WhatsApp icon with a green checkmark, professional flat design."
    },
    {
      id: 5,
      title: "RÁPIDO, AUTOMÁTICO Y 24/7 ⚡",
      subtitle: "Nuestro asistente nunca duerme. Reservas confirmadas al instante.",
      imagePrompt: "Abstract visualization of speed and time, glowing teal lines, professional digital art, sleek execution."
    },
    {
      id: 6,
      title: "CLUBES, CANCHAS Y AMENITIES 🏟️",
      subtitle: "Desde tu partido de pádel hasta el quincho del edificio.",
      imagePrompt: "Aerial view of high-end sports complex with padel courts and a swimming pool area, architectural photography, vibrant teal and navy accents."
    },
    {
      id: 7,
      title: "EMPEZÁ HOY CON RESER+ 🚀",
      subtitle: "Automatizá tus reservas ahora. Dale a tus clientes la velocidad que buscan.",
      imagePrompt: "A professional marketing visual with a rocket launch icon in teal, navy blue background, bold typography, high impact closing slide."
    }
  ]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isGeneratingSlogans, setIsGeneratingSlogans] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isGeneratingCalendar, setIsGeneratingCalendar] = useState(false);
  const [errorHeader, setErrorHeader] = useState<string | null>(null);
  const [monthlyCalendar, setMonthlyCalendar] = useState<ScheduledPost[]>([]);
  const [viewMode, setViewMode] = useState<'editor' | 'calendar'>('editor');

  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  const generateMonthlyPlan = async () => {
    setIsGeneratingCalendar(true);
    setErrorHeader(null);
    try {
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Actúa como un social media manager. Crea un calendario de contenidos de un mes para Reser + en Instagram.
        Reser + permite reservar canchas (fútbol, pádel, tenis) y quinchos/salones sociales de edificios por WhatsApp.
        Necesito 8 ideas de posts (2 por semana). 
        Formato JSON: un array de objetos con: week (1-4), postNumber (1-2), concept (tema del post), slogan (frase principal), detail (explicación breve).`,
        config: { responseMimeType: "application/json" }
      });
      
      const data = JSON.parse(response.text || "[]");
      setMonthlyCalendar(data);
      setViewMode('calendar');
    } catch (error) {
      console.error("Error generating calendar:", error);
      setErrorHeader("No se pudo generar el calendario mensual. Intenta de nuevo.");
    } finally {
      setIsGeneratingCalendar(false);
    }
  };

  const applyFromCalendar = (post: ScheduledPost) => {
    const newSlides = [
      { id: 1, title: post.slogan.toUpperCase(), subtitle: post.detail, imagePrompt: `High quality sports photography about ${post.concept}, navy and teal colors.` },
      { id: 2, title: "RESERVA POR WHATSAPP", subtitle: "Chatea con Reser +, elige tu horario y confirma en segundos sin instalar nada.", imagePrompt: "WhatsApp chat mockup on smartphone, sports background." },
      { id: 3, title: "TE ESPERAMOS EN LA CANCHA", subtitle: "Reser + es el sistema más rápido de Paraguay para tus partidos y eventos.", imagePrompt: "People celebrating after a sports match at night." }
    ];
    setSlides(newSlides);
    setViewMode('editor');
  };

  const generateAIVariation = async () => {
    setIsGeneratingSlogans(true);
    setErrorHeader(null);
    try {
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Actúa como un experto en marketing de Instagram. Crea 3 frases cortas y pegajosas (slogans) para un carrusel de Instagram de Reser +.
        IMPORTANTE: Reser + es una plataforma de reserva de CANCHAS DEPORTIVAS (fútbol, pádel, tenis) y AMENITIES de edificios (quinchos, Salón Social, cocheras) via WhatsApp.
        No es una app de viajes. Es para deportistas y vecinos que quieren reservar rápido.
        Formato: dame solo el texto de una frase por línea.`,
      });
      
      const newTexts = response.text?.split('\n').filter(t => t.trim().length > 0).slice(0, 3) || [];
      if (newTexts.length >= 3) {
        const updatedSlides = slides.map((slide, i) => ({
          ...slide,
          title: newTexts[i] ? newTexts[i].toUpperCase() : slide.title
        }));
        setSlides(updatedSlides);
      }
    } catch (error) {
      console.error("Error generating slogans:", error);
      setErrorHeader("No se pudieron generar los slogans. Reintenta en unos momentos.");
    } finally {
      setIsGeneratingSlogans(false);
    }
  };

  const generateImages = async () => {
    setIsGeneratingImages(true);
    setErrorHeader(null);
    try {
      const updatedSlidesWithImages = await Promise.all(slides.map(async (slide) => {
        try {
          const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [{ 
                text: `${slide.imagePrompt}. High quality real-world background for sports booking app, professional photography, clean composition. Use a professional and sleek color palette dominated by navy blue (#041E42) and vibrant teal (#00A572), with white accents to ensure brand consistency with the Reser + logo.` 
              }],
            },
            config: {
              imageConfig: { aspectRatio: "1:1" }
            },
          });

          const candidate = response.candidates?.[0];
          if (candidate && candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
              if (part.inlineData) {
                return { ...slide, imageUrl: `data:image/png;base64,${part.inlineData.data}` };
              }
            }
          }
          return slide;
        } catch (innerError) {
          console.error(`Error generating image for slide ${slide.id}:`, innerError);
          return slide;
        }
      }));
      setSlides(updatedSlidesWithImages);
    } catch (error) {
      console.error("Error generating images:", error);
      setErrorHeader("Hubo un problema al generar las imágenes. Prueba con prompts más sencillos.");
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const handleUpdateSlide = (id: number, field: keyof Slide, value: string) => {
    setSlides(slides.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#041E42] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#041E42] rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xl">R+</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Reser <span className="text-[#00A572]">+ Ad Studio</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setViewMode(viewMode === 'editor' ? 'calendar' : 'editor')}
              className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-[#041E42] transition-colors"
            >
              {viewMode === 'editor' ? 'Ver Calendario' : 'Volver al Editor'}
            </button>
            <button 
              onClick={generateMonthlyPlan}
              disabled={isGeneratingCalendar}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-navy border border-[#041E42] text-[#041E42] hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Clock className="w-4 h-4" />
              Plan Mensual AI
            </button>
            <button 
              onClick={generateAIVariation}
              disabled={isGeneratingSlogans}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isGeneratingSlogans ? 'animate-spin' : ''}`} />
              Mejorar Slogans
            </button>
            <button 
              onClick={generateImages}
              disabled={isGeneratingImages}
              className="flex items-center gap-2 px-4 py-2 bg-[#00A572] text-white rounded-full hover:bg-[#008f63] transition-colors text-sm font-bold shadow-lg shadow-teal-100 disabled:opacity-50"
            >
              <ImageIcon className={`w-4 h-4 ${isGeneratingImages ? 'animate-pulse' : ''}`} />
              Generar Imágenes AI
            </button>
          </div>
        </div>
        
        {/* Error Banner */}
        <AnimatePresence>
          {errorHeader && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between">
                <p className="text-xs text-red-600 font-medium">{errorHeader}</p>
                <button onClick={() => setErrorHeader(null)} className="text-red-400 hover:text-red-600">
                  <RefreshCcw className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        {viewMode === 'calendar' ? (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Calendario Mensual</h2>
                <p className="text-gray-500">8 ideas listas para programar en Meta Business Suite</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(week => (
                <div key={week} className="space-y-4">
                  <h3 className="font-black text-[#00A572] uppercase text-xs tracking-[0.2em] border-b border-teal-100 pb-2">Semana {week}</h3>
                  {monthlyCalendar.filter(p => p.week === week).map((post, i) => (
                    <div 
                      key={i} 
                      className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => applyFromCalendar(post)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-bold bg-[#041E42] text-white px-2 py-0.5 rounded uppercase">Post {post.postNumber}</span>
                        <Send className="w-3 h-3 text-gray-300 group-hover:text-[#00A572] transition-colors" />
                      </div>
                      <h4 className="font-bold text-sm mb-1 leading-tight">{post.slogan}</h4>
                      <p className="text-[11px] text-gray-400 italic mb-2">{post.concept}</p>
                      <p className="text-xs text-gray-600 line-clamp-2">{post.detail}</p>
                      <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-bold text-[#00A572] uppercase tracking-wider">Editar en Carrusel →</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Editor Side */}
        <section className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Configuración del Carrusel</h2>
            <p className="text-gray-500">Personaliza el mensaje para tu publicidad de Instagram.</p>
          </div>

          <div className="space-y-6">
            {slides.map((slide, idx) => (
              <div key={slide.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 hover:border-[#00A572] transition-colors group">
                <div className="flex items-center justify-between">
                  <span className="bg-[#041E42] text-white text-xs font-bold px-2 py-1 rounded">SLIDE 0{idx + 1}</span>
                  <div className="h-1 w-24 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#00A572]" style={{ width: `${((idx + 1) / slides.length) * 100}%` }}></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Título / Slogan</label>
                    <input 
                      type="text" 
                      value={slide.title}
                      onChange={(e) => handleUpdateSlide(slide.id, 'title', e.target.value)}
                      className="w-full text-lg font-black bg-transparent border-none p-0 focus:ring-0 placeholder-gray-300"
                      placeholder="Ej: ¿PARTIDO HOY?"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cuerpo del mensaje</label>
                    <textarea 
                      value={slide.subtitle}
                      onChange={(e) => handleUpdateSlide(slide.id, 'subtitle', e.target.value)}
                      className="w-full text-gray-600 bg-transparent border-none p-0 focus:ring-0 resize-none h-12 leading-relaxed"
                      placeholder="Describe el beneficio principal..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Prompt de Imagen (Opcional)</label>
                    <input 
                      type="text" 
                      value={slide.imagePrompt}
                      onChange={(e) => handleUpdateSlide(slide.id, 'imagePrompt', e.target.value)}
                      className="w-full text-xs text-teal-600 bg-teal-50/50 p-2 rounded-lg border border-teal-100 focus:ring-0"
                      placeholder="Describe la imagen que deseas generar..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#041E42] text-white p-6 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <Zap className="text-[#00A572]" />
              <h3 className="font-bold">¿Por qué Reser +?</h3>
            </div>
            <ul className="grid grid-cols-2 gap-4 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00A572]" /> Booking WhatsApp
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00A572]" /> Fútbol, Pádel, Salón
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00A572]" /> Sin Instalación
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00A572]" /> En 30 segundos
              </li>
            </ul>
          </div>
        </section>

        {/* Preview Side */}
        <section className="lg:sticky lg:top-32 flex flex-col items-center">
          <div className="relative group">
            {/* Phone Frame */}
            <div className="w-[320px] h-[580px] bg-black rounded-[48px] border-[8px] border-[#1a1a1a] shadow-2xl relative overflow-hidden flex flex-col">
              
              {/* IG Header Mockup */}
              <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[2px]">
                    <div className="w-full h-full bg-white rounded-full p-[1px]">
                      <div className="w-full h-full bg-[#041E42] rounded-full flex items-center justify-center">
                        <span className="text-[10px] text-white font-bold">R+</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold">reser_plus</span>
                </div>
                <Smartphone className="w-4 h-4 text-gray-400" />
              </div>

              {/* Carousel Content */}
              <div className="flex-1 relative bg-white overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ x: 300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -300, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                    className="absolute inset-0 flex flex-col"
                  >
                    {/* Background Visual */}
                    <div className="h-[60%] w-full bg-[#041E42] relative overflow-hidden">
                      {slides[currentSlide].imageUrl ? (
                        <img 
                          src={slides[currentSlide].imageUrl} 
                          alt="AI generated"
                          className="w-full h-full object-cover opacity-80"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-[#00A572] opacity-20" />
                        </div>
                      )}
                      
                      {/* Logo Overlay */}
                      <div className="absolute top-4 left-4 bg-white px-2 py-1 rounded">
                        <span className="text-[#041E42] font-black text-xs uppercase">Reser +</span>
                      </div>

                      {/* Brand Accents */}
                      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#00A572] rounded-full opacity-20 blur-2xl"></div>
                    </div>

                    {/* Text Content */}
                    <div className="flex-1 p-6 flex flex-col justify-center space-y-4 bg-white">
                      <motion.h3 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-2xl font-black leading-[0.9] tracking-tight uppercase"
                      >
                        {slides[currentSlide].title}
                      </motion.h3>
                      <motion.p 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-sm text-gray-600 leading-relaxed"
                      >
                        {slides[currentSlide].subtitle}
                      </motion.p>
                      
                      <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="pt-2"
                      >
                        <div className="flex items-center gap-2 text-[10px] font-bold text-[#00A572] uppercase tracking-[0.2em]">
                          <Send className="w-3 h-3" />
                          <span>Envía un mensaje ahora</span>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Controls Overlay */}
                <div className="absolute inset-y-0 left-0 flex items-center">
                  <button onClick={prevSlide} className="p-2 bg-black/10 hover:bg-black/20 text-white rounded-r-lg">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center">
                  <button onClick={nextSlide} className="p-2 bg-black/10 hover:bg-black/20 text-white rounded-l-lg">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* IG Footer Mockup */}
              <div className="bg-white p-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex gap-4">
                  <Sparkles className="w-5 h-5 text-gray-800" />
                  <Type className="w-5 h-5 text-gray-800" />
                </div>
                <div className="flex gap-1">
                  {slides.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1 rounded-full transition-all ${i === currentSlide ? 'w-4 bg-[#00A572]' : 'w-1 bg-gray-200'}`}
                    ></div>
                  ))}
                </div>
                <Send className="w-5 h-5 text-[#00A572]" />
              </div>

            </div>
            
            {/* Phone Shadow/Reflection */}
            <div className="absolute -inset-4 bg-gradient-to-b from-transparent via-teal-500/5 to-navy-500/10 blur-3xl -z-10 rounded-[64px] opacity-50"></div>
          </div>

          <p className="mt-8 text-sm font-medium text-gray-400 flex items-center gap-2 uppercase tracking-widest">
            <Smartphone className="w-4 h-4" />
            VISTA PREVIA DE CARRUSEL
          </p>
        </section>
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="max-w-7xl mx-auto px-8 py-12 border-t border-gray-200 mt-12 flex flex-col md:flex-row justify-between items-center gap-8 text-gray-400">
        <div className="flex items-center gap-2">
          <span className="font-black text-xl text-[#041E42]">Reser <span className="text-[#00A572]">+</span></span>
          <span className="text-xs uppercase tracking-tighter">© 2026 Admin Studio</span>
        </div>
        <div className="flex gap-8 text-sm font-medium">
          <a href="#" className="hover:text-[#00A572] transition-colors">WhatsApp API</a>
          <a href="#" className="hover:text-[#00A572] transition-colors">Canchas</a>
          <a href="#" className="hover:text-[#00A572] transition-colors">Amenities</a>
          <a href="#" className="hover:text-[#00A572] transition-colors">Contacto</a>
        </div>
      </footer>

      {/* Loading Overlays */}
      <AnimatePresence>
        {(isGeneratingImages || isGeneratingSlogans || isGeneratingCalendar) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#041E42]/90 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="relative">
              <RefreshCcw className="w-16 h-16 text-[#00A572] animate-spin" />
              <div className="absolute inset-0 bg-[#00A572] blur-2xl opacity-20 animate-pulse"></div>
            </div>
            <h2 className="text-white text-3xl font-black mt-8 uppercase tracking-tighter">
              Potenciando tu Marca con AI
            </h2>
            <p className="text-teal-200 mt-2 max-w-md">
              Estamos diseñando los spots y visuales más pegajosos para que tu plataforma de reservas destaque en Instagram.
            </p>
            <div className="mt-12 flex gap-4">
              <div className="flex items-center gap-2 text-xs text-white/50">
                <Clock className="w-3 h-3" /> Generando contenido creativo...
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
