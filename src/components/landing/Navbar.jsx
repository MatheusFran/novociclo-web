import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
    { label: "Início", href: "#hero" },
    { label: "Sobre", href: "#sobre" },
    { label: "Produtos", href: "#produtos" },
    { label: "Diferenciais", href: "#diferenciais" },
    { label: "Depoimentos", href: "#depoimentos" },
    { label: "Contato", href: "#contato" },
];

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
                    ? "bg-white/95 backdrop-blur-xl shadow-md border-b border-primary/10"
                    : "bg-transparent"
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 sm:h-20">
                    <a href="#hero" className="flex items-center gap-2 group">
                        <img
                            src="/logo.png"
                            alt="Novo Ciclo"
                            className="h-10 sm:h-12 w-auto object-contain group-hover:drop-shadow-lg transition-all"
                        />
                    </a>

                    <div className="hidden lg:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="px-3 lg:px-4 py-2 text-sm font-body font-medium text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-primary/5"
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>

                    <div className="hidden lg:block">
                        <Button asChild className="rounded-full px-6 font-body bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white">
                            <a href="#contato">Fale Conosco</a>
                        </Button>
                    </div>

                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="lg:hidden p-2 text-foreground hover:bg-primary/10 rounded-lg transition-colors"
                    >
                        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="lg:hidden bg-white/95 backdrop-blur-xl border-b border-primary/10 overflow-hidden"
                    >
                        <div className="px-4 sm:px-6 py-4 space-y-1">
                            {navLinks.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileOpen(false)}
                                    className="block px-4 py-2 text-sm font-body font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                                >
                                    {link.label}
                                </a>
                            ))}
                            <div className="pt-2 px-2">
                                <Button asChild className="w-full rounded-full font-body bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white">
                                    <a href="#contato" onClick={() => setMobileOpen(false)}>Fale Conosco</a>
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
}