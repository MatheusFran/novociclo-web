import React from "react";
import { motion } from "framer-motion";
import { Award, Users, Truck, Leaf } from "lucide-react";

const stats = [
    { icon: Award, value: "100%", label: "Orgânico e Natural" },
    { icon: Users, value: "50k+", label: "Clientes Satisfeitos" },
    { icon: Truck, value: "36L", label: "Embalagem Prática" },
    { icon: Leaf, value: "Zero", label: "Resíduos Tóxicos" },
];

export default function AboutSection({ aboutImage }) {
    return (
        <section id="sobre" className="py-20 lg:py-32 bg-gradient-to-b from-white via-slate-50/30 to-accent/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    {/* Image */}
                    <motion.div
                        initial={{ opacity: 0, x: -40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="relative"
                    >
                        <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-xl border border-primary/10">
                            <img
                                src={aboutImage}
                                alt="Produto Novo Ciclo Terra Vegetal"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        {/* Logo overlay */}
                        <div className="absolute -bottom-5 -right-5 bg-white rounded-2xl shadow-2xl p-3 sm:p-4 border border-primary/20">
                            <img
                                src="/logo.png"
                                alt="Novo Ciclo"
                                className="h-12 sm:h-14 w-auto object-contain"
                            />
                        </div>
                        <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full -z-10 blur-3xl"
                            style={{ background: "hsl(84, 55%, 48%, 0.15)" }} />
                    </motion.div>

                    {/* Content */}
                    <motion.div
                        initial={{ opacity: 0, x: 40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <span className="text-xs sm:text-sm font-body font-bold tracking-widest uppercase text-accent mb-4 block">
                            Sobre a Novo Ciclo
                        </span>
                        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
                            Composto orgânico com
                            <br />
                            <span className="italic text-primary">alto giro</span> e mais margem
                        </h2>
                        <p className="font-body text-muted-foreground text-base sm:text-lg leading-relaxed mb-6">
                            A Novo Ciclo nasceu com o propósito de transformar resíduos orgânicos em
                            soluções de alto valor para o agronegócio e a jardinagem urbana. Nossa
                            Terra Vegetal é produzida com rigoroso controle de qualidade, garantindo
                            um produto livre de patógenos, ervas daninhas e impurezas.
                        </p>
                        <p className="font-body text-muted-foreground text-sm sm:text-base leading-relaxed mb-10">
                            Ideal para gramados, hortas e jardins, nosso composto orgânico oferece
                            nutrição completa pronta para uso. Para revendedores, representa um produto
                            com alto giro, boa margem e recompra recorrente garantida.
                        </p>

                        <div className="grid grid-cols-2 gap-6">
                            {stats.map((stat, i) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1, duration: 0.5 }}
                                    className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-white to-primary/5 border border-primary/10"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                                        <stat.icon className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-heading text-xl sm:text-2xl font-bold text-foreground">{stat.value}</p>
                                        <p className="font-body text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}