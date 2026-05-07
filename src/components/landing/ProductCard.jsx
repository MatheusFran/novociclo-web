import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

export default function ProductCard({ product, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.6 }}
            className="group cursor-pointer"
        >
            <div className="relative rounded-2xl overflow-hidden bg-card aspect-square mb-5">
                <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {product.badge && (
                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-body font-bold text-white"
                        style={{ background: "hsl(138, 72%, 22%)" }}>
                        {product.badge}
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                    <ArrowUpRight className="w-5 h-5 text-primary-foreground" />
                </div>
            </div>
            <h3 className="font-heading text-xl font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                {product.title}
            </h3>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
                {product.description}
            </p>
        </motion.div>
    );
}