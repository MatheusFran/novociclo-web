import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, TrendingUp, Repeat, Leaf, FlaskConical, Handshake } from "lucide-react";

const features = [
    {
        icon: ShieldCheck,
        title: "Livre de Patógenos",
        description: "Processo de compostagem controlado que elimina patógenos, ervas daninhas e impurezas, garantindo segurança total.",
    },
    {
        icon: TrendingUp,
        title: "Alto Giro no Ponto de Venda",
        description: "Produto com alta demanda no mercado de jardinagem e gramados. Revendedores relatam giro rápido e constante.",
    },
    {
        icon: Repeat,
        title: "Alta Recompra",
        description: "Clientes que usam retornam. A qualidade visível no resultado cria fidelização natural e recompra recorrente.",
    },
    {
        icon: Leaf,
        title: "100% Orgânico",
        description: "Formulado apenas com matéria orgânica de origem natural. Seguro para uso em hortas, gramados e jardins.",
    },
    {
        icon: FlaskConical,
        title: "Pronto para Uso",
        description: "Sem necessidade de mistura ou preparo. Aplique diretamente no solo e veja os resultados rapidamente.",
    },
    {
        icon: Handshake,
        title: "Suporte ao Revendedor",
        description: "Oferecemos materiais de apoio, condições especiais e consultoria para maximizar suas vendas.",
    },
];

export default function FeaturesSection() {
    return (
        <section id="diferenciais" className="py-20 lg:py-32 bg-gradient-to-b from-slate-50/50 to-accent/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="text-xs sm:text-sm font-body font-bold tracking-widest uppercase text-accent mb-4 block">
                        Por que nos escolher
                    </span>
                    <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                        Nossos <span className="italic text-primary">diferenciais</span>
                    </h2>
                    <p className="font-body text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                        Mais giro. Mais margem. Mais recompra. Veja por que a Novo Ciclo é a escolha certa para sua loja e para o seu jardim.
                    </p>
                </motion.div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            className="group p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-white to-primary/5 border border-primary/10 hover:border-accent/30 hover:shadow-xl hover:shadow-primary/10 transition-all duration-500"
                        >
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6 group-hover:from-primary/30 group-hover:to-accent/30 transition-all duration-500">
                                <feature.icon className="w-7 h-7 text-primary" />
                            </div>
                            <h3 className="font-heading text-xl font-semibold text-foreground mb-3">
                                {feature.title}
                            </h3>
                            <p className="font-body text-muted-foreground leading-relaxed text-sm">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}