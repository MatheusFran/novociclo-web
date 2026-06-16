import React from "react";
import { motion } from "framer-motion";
import { ArrowDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HeroSection({ heroImage }) {
    return (
        <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
            {/* Background image */}
            <div className="absolute inset-0">
                <img
                    src={heroImage}
                    alt="Jardim exuberante com produtos de jardinagem premium"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-primary/85 via-primary/50 to-transparent" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
                <div className="max-w-2xl">
                    {/* Logo da marca */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="mb-8"
                    >
                        <img
                            src="/logo.png"
                            alt="Novo Ciclo"
                            className="h-16 sm:h-20 w-auto object-contain drop-shadow-2xl filter brightness-0 invert"
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/30 mb-8 hover:bg-white/20 transition-all"
                    >
                        <Sparkles className="w-4 h-4 text-white" />
                        <span className="text-sm font-body font-semibold text-white">
                            Terra Vegetal 100% Orgânica
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6"
                    >
                        Nutrição de verdade
                        <br />
                        para o seu <span className="italic text-accent drop-shadow-lg">gramado</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="font-body text-base sm:text-lg text-white/90 max-w-lg mb-10 leading-relaxed"
                    >
                        Composto orgânico com alto giro, boa margem e aplicação versátil.
                        A solução completa para gramados, hortas e jardins com qualidade profissional.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.8 }}
                        className="flex flex-wrap gap-3 sm:gap-4"
                    >
                        <Button
                            asChild
                            size="lg"
                            className="rounded-full px-6 sm:px-8 text-sm sm:text-base font-body font-semibold bg-white text-primary hover:bg-primary/10 hover:text-white hover:border-white"
                        >
                            <a href="#produtos">Ver Catálogo</a>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="rounded-full px-6 sm:px-8 text-sm sm:text-base font-body font-semibold bg-white/10 border-white/40 text-white hover:bg-white/20 hover:border-white transition-all"
                        >
                            <a href="#sobre">Nossa História</a>
                        </Button>
                    </motion.div>
                </div>
            </div>

            {/* Scroll indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
            >
                <motion.a
                    href="#sobre"
                    animate={{ y: [0, 8, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="flex flex-col items-center gap-2 text-white/70 hover:text-white/90 transition-colors"
                >
                    <span className="text-xs font-body tracking-widest uppercase font-semibold">Explorar</span>
                    <ArrowDown className="w-4 h-4" />
                </motion.a>
            </motion.div>
        </section>
    );
}