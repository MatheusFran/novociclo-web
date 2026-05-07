import React from "react";
import { Separator } from "@/components/ui/separator";

const footerLinks = [
    {
        title: "Produtos",
        links: ["Terra Vegetal", "Substrato para Horta", "Composto para Paisagismo", "Terra para Interior", "Kit Revendedor", "Condicionador de Solo"],
    },
    {
        title: "Empresa",
        links: ["Sobre a Novo Ciclo", "Nossa Missão", "Sustentabilidade", "Seja um Revendedor", "Blog"],
    },
    {
        title: "Suporte",
        links: ["Central de Ajuda", "Como Aplicar", "Política de Trocas", "FAQ", "Contato via WhatsApp"],
    },
];

export default function Footer() {
    return (
        <footer className="bg-foreground text-background">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
                <div className="grid md:grid-cols-4 gap-12 mb-12">
                    {/* Brand */}
                    <div>
                        <div className="mb-5">
                            <img
                                src="https://media.base44.com/images/public/69fc7a106aa628b0f94b4a74/5b694c960_logonewbranca.png"
                                alt="Novo Ciclo"
                                className="h-14 w-auto object-contain"
                            />
                        </div>
                        <p className="font-body text-sm text-background/60 leading-relaxed">
                            Composto orgânico de alta qualidade para gramados, hortas e jardins.
                            Sustentabilidade e resultado em cada saco.
                        </p>
                    </div>

                    {/* Links */}
                    {footerLinks.map((col) => (
                        <div key={col.title}>
                            <h4 className="font-heading font-semibold text-sm mb-5 tracking-wide">
                                {col.title}
                            </h4>
                            <ul className="space-y-3">
                                {col.links.map((link) => (
                                    <li key={link}>
                                        <span className="font-body text-sm text-background/50 hover:text-background/90 transition-colors cursor-pointer">
                                            {link}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <Separator className="bg-background/10 mb-8" />

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="font-body text-xs text-background/40">
                        © {new Date().getFullYear()} Novo Ciclo. Todos os direitos reservados.
                    </p>
                    <div className="flex items-center gap-6">
                        <span className="font-body text-xs text-background/40 hover:text-background/70 cursor-pointer transition-colors">
                            Política de Privacidade
                        </span>
                        <span className="font-body text-xs text-background/40 hover:text-background/70 cursor-pointer transition-colors">
                            Termos de Uso
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}