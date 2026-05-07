import React from "react";
import { motion } from "framer-motion";
import ProductCard from "./ProductCard";

export default function ProductsSection({ products }) {
    return (
        <section id="produtos" className="py-24 lg:py-32 bg-muted/30">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="text-sm font-body font-semibold tracking-widest uppercase text-primary mb-4 block">
                        Nosso Catálogo
                    </span>
                    <h2 className="font-heading text-3xl lg:text-5xl font-bold text-foreground mb-6">
                        Produtos que fazem a <span className="italic">diferença</span>
                    </h2>
                    <p className="font-body text-muted-foreground text-lg max-w-2xl mx-auto">
                        Explore nossa seleção premium de produtos de jardinagem,
                        cuidadosamente escolhidos para atender todas as suas necessidades.
                    </p>
                </motion.div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {products.map((product, i) => (
                        <ProductCard key={product.title} product={product} index={i} />
                    ))}
                </div>
            </div>
        </section>
    );
}