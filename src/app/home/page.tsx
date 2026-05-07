"use client"

import React from "react";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import AboutSection from "@/components/landing/AboutSection";
import ProductsSection from "@/components/landing/ProductSection";
import FeaturesSection from "@/components/landing/FeatureSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import ContactSection from "@/components/landing/ContactSection";
import Footer from "@/components/landing/Footer";


const HERO_IMAGE = "https://media.base44.com/images/public/69fc7a106aa628b0f94b4a74/9f42eff42_ofertagramado.jpg";
const ABOUT_IMAGE = "https://media.base44.com/images/public/69fc7a106aa628b0f94b4a74/e9c244865_WhatsAppImage2026-02-09at115342.jpeg";
const PRODUCT_BAG_1 = "https://media.base44.com/images/public/69fc7a106aa628b0f94b4a74/d73a1d591_WhatsApp_Image_2026-02-09_at_115342-removebg-preview.png";
const PRODUCT_BAG_2 = "https://media.base44.com/images/public/69fc7a106aa628b0f94b4a74/e9c244865_WhatsAppImage2026-02-09at115342.jpeg";

const products = [
    {
        title: "Terra Vegetal — Nutrição para Gramado",
        description: "Composto orgânico 100% natural, pronto para uso. Nutre, restaura e fortalece gramados com alto giro e excelente resultado.",
        image: PRODUCT_BAG_1,
        badge: "Mais Vendido",
    },
    {
        title: "Substrato para Horta Orgânica",
        description: "Substrato enriquecido ideal para hortas em vasos e canteiros. Livre de patógenos e ervas daninhas.",
        image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80",
        badge: null,
    },
    {
        title: "Composto para Paisagismo",
        description: "Formulado para projetos de paisagismo e jardinagem profissional. Alta performance e versatilidade.",
        image: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&q=80",
        badge: "Novo",
    },
    {
        title: "Terra para Plantas de Interior",
        description: "Substrato especial com drenagem otimizada para plantas de interior, suculentas e cactos.",
        image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=80",
        badge: null,
    },
    {
        title: "Kit Revendedor — 35 Litros",
        description: "Oferta exclusiva para revendedores. Alto giro, boa margem e recompra garantida. Peça sua cotação especial.",
        image: PRODUCT_BAG_2,
        badge: "Para Revendedores",
    },
    {
        title: "Condicionador de Solo",
        description: "Melhora a estrutura física e biológica do solo. Ideal para renovação de gramados e jardins degradados.",
        image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80",
        badge: null,
    },
];

export default function Home() {
    return (
        <div className="min-h-screen bg-background font-body">
            <Navbar />
            <HeroSection heroImage={HERO_IMAGE} />
            <AboutSection aboutImage={ABOUT_IMAGE} />
            <ProductsSection products={products} />
            <FeaturesSection />
            <TestimonialsSection />
            <ContactSection />
            <Footer />
        </div>
    );
}