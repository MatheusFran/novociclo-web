"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const contactInfo = [
    { icon: MapPin, label: "Endereço", value: "Rua das Flores, 1234 — São Paulo, SP" },
    { icon: Phone, label: "Telefone / WhatsApp", value: "(11) 9 8765-4321" },
    { icon: Mail, label: "E-mail", value: "contato@novociclo.com.br" },
    { icon: Clock, label: "Horário de Atendimento", value: "Seg-Sex: 8h às 18h | Sáb: 8h às 13h" },
];

export default function ContactSection() {
    const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });

    const handleSubmit = (e) => {
        e.preventDefault();
        // toast({
        //     title: "Mensagem enviada!",
        //     description: "Nossa equipe entrará em contato em breve. Obrigado pelo interesse!",
        // });
        setFormData({ name: "", email: "", phone: "", message: "" });
    };

    return (
        <section id="contato" className="py-24 lg:py-32 bg-muted/30">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                {/* WhatsApp CTA Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="rounded-2xl p-8 sm:p-10 mb-16 text-white flex flex-col sm:flex-row items-center justify-between gap-6"
                    style={{ background: "linear-gradient(135deg, hsl(138,72%,22%) 0%, hsl(138,60%,30%) 100%)" }}
                >
                    <div>
                        <p className="font-body text-sm font-semibold uppercase tracking-widest opacity-75 mb-2">
                            Oferta Exclusiva para Revendedores
                        </p>
                        <h3 className="font-heading text-2xl sm:text-3xl font-bold mb-2">
                            Mais giro · Mais margem · Mais recompra
                        </h3>
                        <p className="font-body text-white/80">
                            Chame no WhatsApp e peça sua cotação especial agora.
                        </p>
                    </div>
                    <Button
                        size="lg"
                        className="rounded-full px-8 font-body font-semibold flex-shrink-0 gap-2 bg-white hover:bg-white/90"
                        style={{ color: "hsl(138,72%,22%)" }}
                        asChild
                    >
                        <a href="https://wa.me/5511987654321" target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="w-5 h-5" />
                            Chamar no WhatsApp
                        </a>
                    </Button>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="text-sm font-body font-semibold tracking-widest uppercase text-primary mb-4 block">
                        Entre em Contato
                    </span>
                    <h2 className="font-heading text-3xl lg:text-5xl font-bold text-foreground mb-6">
                        Vamos conversar sobre seu <span className="italic">projeto</span>
                    </h2>
                    <p className="font-body text-muted-foreground text-lg max-w-2xl mx-auto">
                        Estamos prontos para ajudá-lo a escolher os melhores produtos para o seu jardim ou loja.
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-5 gap-12">
                    {/* Contact info */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="lg:col-span-2 space-y-8"
                    >
                        {contactInfo.map((info) => (
                            <div key={info.label} className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <info.icon className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-body text-sm font-semibold text-foreground mb-1">{info.label}</p>
                                    <p className="font-body text-muted-foreground">{info.value}</p>
                                </div>
                            </div>
                        ))}
                    </motion.div>

                    {/* Form */}
                    <motion.form
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        onSubmit={handleSubmit}
                        className="lg:col-span-3 p-8 rounded-2xl bg-card border border-border/50 shadow-sm space-y-5"
                    >
                        <div className="grid sm:grid-cols-2 gap-5">
                            <div>
                                <label className="font-body text-sm font-medium text-foreground mb-2 block">Nome</label>
                                <Input
                                    placeholder="Seu nome completo"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="rounded-xl font-body"
                                    required
                                />
                            </div>
                            <div>
                                <label className="font-body text-sm font-medium text-foreground mb-2 block">E-mail</label>
                                <Input
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="rounded-xl font-body"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="font-body text-sm font-medium text-foreground mb-2 block">Telefone / WhatsApp</label>
                            <Input
                                placeholder="(11) 9 0000-0000"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="rounded-xl font-body"
                            />
                        </div>
                        <div>
                            <label className="font-body text-sm font-medium text-foreground mb-2 block">Mensagem</label>
                            <Textarea
                                placeholder="Como podemos ajudá-lo? (Ex: quero ser revendedor, preciso de cotação...)"
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                className="rounded-xl font-body min-h-[120px]"
                                required
                            />
                        </div>
                        <Button type="submit" size="lg" className="w-full rounded-xl font-body font-semibold">
                            <Send className="w-4 h-4 mr-2" />
                            Enviar Mensagem
                        </Button>
                    </motion.form>
                </div>
            </div>
        </section>
    );
}