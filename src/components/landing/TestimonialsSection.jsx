import React from "react";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
    {
        name: "Carlos Eduardo Silva",
        role: "Proprietário de Pet Shop & Jardinagem",
        text: "Desde que comecei a revender a Terra Vegetal Novo Ciclo, o giro no ponto de venda aumentou muito. Produto de qualidade que o cliente experimenta e volta.",
        rating: 5,
    },
    {
        name: "Marcos Andrade",
        role: "Paisagista Profissional",
        text: "Uso a Terra Vegetal da Novo Ciclo em todos os meus projetos de gramado. O resultado é visível em poucos dias. Meus clientes ficam impressionados.",
        rating: 5,
    },
    {
        name: "Ana Paula Ferreira",
        role: "Proprietária de Loja Agropecuária",
        text: "Produto com ótima margem e recompra garantida. A Novo Ciclo nos dá suporte completo. Foi a melhor decisão que tomei para o mix da minha loja.",
        rating: 5,
    },
];

export default function TestimonialsSection() {
    return (
        <section id="depoimentos" className="py-24 lg:py-32 bg-primary">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="text-sm font-body font-semibold tracking-widest uppercase text-primary-foreground/70 mb-4 block">
                        Depoimentos
                    </span>
                    <h2 className="font-heading text-3xl lg:text-5xl font-bold text-primary-foreground mb-6">
                        O que dizem nossos <span className="italic">parceiros</span>
                    </h2>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((t, i) => (
                        <motion.div
                            key={t.name}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.15, duration: 0.6 }}
                            className="p-8 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/10"
                        >
                            <Quote className="w-8 h-8 mb-4 opacity-40" style={{ color: "#8FD14F" }} />
                            <p className="font-body text-primary-foreground/90 leading-relaxed mb-6">
                                "{t.text}"
                            </p>
                            <div className="flex items-center gap-1 mb-4">
                                {Array.from({ length: t.rating }).map((_, j) => (
                                    <Star key={j} className="w-4 h-4" style={{ fill: "#8FD14F", color: "#8FD14F" }} />
                                ))}
                            </div>
                            <div>
                                <p className="font-heading font-semibold text-primary-foreground">{t.name}</p>
                                <p className="font-body text-sm text-primary-foreground/60">{t.role}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}