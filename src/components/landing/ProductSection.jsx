import React from "react";
import { motion } from "framer-motion";
import ProductCard from "./ProductCard";

export default function ProductsSection({ products }) {
    return (
        <section id="produtos" className="py-20 lg:py-32 bg-gradient-to-b from-accent/5 to-slate-50/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="text-xs sm:text-sm font-body font-bold tracking-widest uppercase text-accent mb-4 block">
                        Nosso Catálogo
                    </span>
                    <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                        Produtos que fazem a <span className="italic text-primary">diferença</span>
                    </h2>
                    <p className="font-body text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                        Explore nossa seleção premium de produtos de jardinagem,
                        cuidadosamente escolhidos para atender todas as suas necessidades.
                    </p>
                </motion.div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {products.map((product, i) => (
                        <ProductCard key={product.title} product={product} index={i} />
                    ))}
                </div>
            </div>
        </section>
    );
}