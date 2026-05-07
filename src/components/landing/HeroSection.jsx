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
                <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/50 to-transparent" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-20">
                <div className="max-w-2xl">
                    {/* Logo da marca */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="mb-8"
                    >
                        <img
                            src="https://media.base44.com/images/public/69fc7a106aa628b0f94b4a74/5b694c960_logonewbranca.png"
                            alt="Novo Ciclo"
                            className="h-20 sm:h-24 w-auto object-contain drop-shadow-xl"
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/30 backdrop-blur-sm border border-primary/40 mb-8"
                    >
                        <Sparkles className="w-4 h-4 text-white" />
                        <span className="text-sm font-body font-medium text-white">
                            Terra Vegetal 100% Orgânica
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="font-heading text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-tight mb-6"
                    >
                        Nutrição de verdade
                        <br />
                        para o seu <span className="italic" style={{ color: "#8FD14F" }}>gramado</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="font-body text-lg text-white/85 max-w-lg mb-10 leading-relaxed"
                    >
                        Composto orgânico com alto giro, boa margem e aplicação versátil.
                        A solução completa para gramados, hortas e jardins com qualidade profissional.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.8 }}
                        className="flex flex-wrap gap-4"
                    >
                        <Button
                            asChild
                            size="lg"
                            className="rounded-full px-8 text-base font-body font-semibold"
                        >
                            <a href="#produtos">Ver Catálogo</a>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="rounded-full px-8 text-base font-body font-semibold bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
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
                    className="flex flex-col items-center gap-2 text-white/60 hover:text-white/90 transition-colors"
                >
                    <span className="text-xs font-body tracking-widest uppercase">Explorar</span>
                    <ArrowDown className="w-4 h-4" />
                </motion.a>
            </motion.div>
        </section>
    );
}