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
        <footer className="bg-gradient-to-b from-primary to-primary/95 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-10 sm:mb-12">
                    {/* Brand */}
                    <div>
                        <div className="mb-5">
                            <img
                                src="/logo.png"
                                alt="Novo Ciclo"
                                className="h-12 sm:h-14 w-auto object-contain filter brightness-0 invert"
                            />
                        </div>
                        <p className="font-body text-xs sm:text-sm text-white/70 leading-relaxed">
                            Composto orgânico de alta qualidade para gramados, hortas e jardins.
                            Sustentabilidade e resultado em cada saco.
                        </p>
                    </div>

                    {/* Links */}
                    {footerLinks.map((col) => (
                        <div key={col.title}>
                            <h4 className="font-heading font-semibold text-xs sm:text-sm mb-4 sm:mb-5 tracking-wide">
                                {col.title}
                            </h4>
                            <ul className="space-y-2 sm:space-y-3">
                                {col.links.map((link) => (
                                    <li key={link}>
                                        <span className="font-body text-xs sm:text-sm text-white/60 hover:text-white/90 transition-colors cursor-pointer">
                                            {link}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <Separator className="bg-white/20 mb-6 sm:mb-8" />

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="font-body text-xs text-white/50">
                        © {new Date().getFullYear()} Novo Ciclo. Todos os direitos reservados.
                    </p>
                    <div className="flex items-center gap-4 sm:gap-6">
                        <span className="font-body text-xs text-white/50 hover:text-white/70 cursor-pointer transition-colors">
                            Política de Privacidade
                        </span>
                        <span className="font-body text-xs text-white/50 hover:text-white/70 cursor-pointer transition-colors">
                            Termos de Uso
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}