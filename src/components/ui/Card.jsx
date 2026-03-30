import { forwardRef } from "react";
import { LazyImage } from "./LazyImage";

/**
 * Card Component
 * Reusable card with image, content, and hover effects
 * @param {Object} props - Component props
 */
export const Card = forwardRef(({
  image,
  imageAlt = "",
  title,
  subtitle,
  description,
  children,
  className = "",
  onClick,
  hoverEffect = true,
  showImage = true,
  imageAspectRatio = "4/3",
  ...props
}, ref) => {
  const aspectRatios = {
    "1/1": "aspect-square",
    "4/3": "aspect-[4/3]",
    "3/2": "aspect-[3/2]",
    "16/9": "aspect-[16/9]",
    "auto": "aspect-auto",
  };

  return (
    <div
      ref={ref}
      className={`
        group relative overflow-hidden rounded-lg
        bg-[color:var(--retro-bg-primary)]
        shadow-retro hover:shadow-retro-lg
        transition-all duration-300
        ${hoverEffect ? "hover:-translate-y-1" : ""}
        ${onClick ? "cursor-pointer" : ""}
        ${className}
      `}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      {...props}
    >
      {/* Image */}
      {showImage && image && (
        <div className={`relative overflow-hidden ${aspectRatios[imageAspectRatio] || aspectRatios["4/3"]}`}>
          <LazyImage
            src={image}
            alt={imageAlt || title || ""}
            className="transition-transform duration-500 group-hover:scale-105"
          />
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--retro-bg-dark)]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      )}

      {/* Content */}
      {(title || subtitle || description || children) && (
        <div className="p-5">
          {subtitle && (
            <p className="text-sm font-medium text-[color:var(--retro-text-secondary)] mb-1">
              {subtitle}
            </p>
          )}

          {title && (
            <h3 className="text-lg font-semibold text-[color:var(--retro-text-primary)] mb-2 line-clamp-1">
              {title}
            </h3>
          )}

          {description && (
            <p className="text-sm text-[color:var(--retro-text-muted)] line-clamp-2">
              {description}
            </p>
          )}

          {children}
        </div>
      )}
    </div>
  );
});

PhotoCard.displayName = "PhotoCard";

/**
 * PhotoCard Component
 * Specialized card for photography gallery items
 * @param {Object} props - Component props
 */
export const PhotoCard = forwardRef(({
  photo,
  onClick,
  className = "",
  ...props
}, ref) => {
  if (!photo) return null;

  return (
    <Card
      ref={ref}
      image={photo.thumbnail || photo.image}
      imageAlt={photo.title}
      title={photo.title}
      subtitle={`${photo.location} • ${photo.year}`}
      description={photo.description}
      className={className}
      onClick={() => onClick?.(photo)}
      hoverEffect={true}
      imageAspectRatio="4/3"
      {...props}
    >
      {/* Category badge */}
      {photo.category && (
        <span className="inline-block mt-3 px-2 py-1 text-xs font-medium bg-[color:var(--retro-bg-tertiary)] text-[color:var(--retro-text-secondary)] rounded-full capitalize">
          {photo.category}
        </span>
      )}
    </Card>
  );
});

PhotoCard.displayName = "PhotoCard";

export default Card;
