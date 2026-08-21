'use client';

import React from 'react';
import {
  BedDouble,
  Bed,
  Bath,
  UtensilsCrossed,
  Utensils,
  Sofa,
  Flame,
  Waves,
  Trees,
  Sun,
  Maximize2,
  Car,
  Shirt,
  Laptop,
  Boxes,
  Cog,
  Gamepad2,
  Dog,
  MoreHorizontal,
  DoorClosed,
  Home,
  Tv,
  Warehouse,
  Wind,
  Wrench,
  Shield,
  Sparkles
} from 'lucide-react';

interface RoomIconProps {
  name?: string;
  className?: string;
  size?: number;
}

export default function RoomIcon({ name = 'DoorClosed', className = 'text-white', size = 20 }: RoomIconProps) {
  const iconMap: Record<string, React.ReactElement> = {
    BedDouble: <BedDouble size={size} className={className} />,
    Bed: <Bed size={size} className={className} />,
    Bath: <Bath size={size} className={className} />,
    UtensilsCrossed: <UtensilsCrossed size={size} className={className} />,
    Utensils: <Utensils size={size} className={className} />,
    Sofa: <Sofa size={size} className={className} />,
    Flame: <Flame size={size} className={className} />,
    Waves: <Waves size={size} className={className} />,
    Trees: <Trees size={size} className={className} />,
    Sun: <Sun size={size} className={className} />,
    Maximize2: <Maximize2 size={size} className={className} />,
    Car: <Car size={size} className={className} />,
    Shirt: <Shirt size={size} className={className} />,
    Laptop: <Laptop size={size} className={className} />,
    Boxes: <Boxes size={size} className={className} />,
    Cog: <Cog size={size} className={className} />,
    Gamepad2: <Gamepad2 size={size} className={className} />,
    Dog: <Dog size={size} className={className} />,
    MoreHorizontal: <MoreHorizontal size={size} className={className} />,
    DoorClosed: <DoorClosed size={size} className={className} />,
    Home: <Home size={size} className={className} />,
    Tv: <Tv size={size} className={className} />,
    Warehouse: <Warehouse size={size} className={className} />,
    Wind: <Wind size={size} className={className} />,
    Wrench: <Wrench size={size} className={className} />,
    Shield: <Shield size={size} className={className} />,
    Sparkles: <Sparkles size={size} className={className} />
  };

  return iconMap[name] || <DoorClosed size={size} className={className} />;
}
