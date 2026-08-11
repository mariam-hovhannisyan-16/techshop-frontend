import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { Auth } from './auth';
import { environment } from '../../environments/environment';

export interface StorageOption {
  label: string;
  priceDelta: number;
}

export interface ColorVariant {
  label: string;
  imageUrl: string;
}

export interface ProductResponse {
  id: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
  category?: string;
  brand?: string;
  originalPrice?: number;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  badge?: 'bestseller' | 'new' | 'top-rated' | 'hot-deal';
  spec?: string;
  warrantyYears?: number;
  // Only populated for phone/tablet-type mock products — the live backend has
  // no notion of storage variants, so this is undefined for real products and
  // the storage selector on product-detail simply doesn't render for those.
  storageOptions?: StorageOption[];
  // Phone-only, mock-only, same reasoning as storageOptions above.
  simOptions?: string[];
  colorVariants?: ColorVariant[];
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// The live backend's raw product payload: `stock` instead of `quantity`, and
// `imageUrl` is a path relative to environment.imageBaseUrl, not an absolute URL.
// It also has no notion of `originalPrice` — discounts are modeled as a
// `discountPercentage` off the current `price` instead; see normalizeProduct().
interface BackendProductPayload extends Omit<ProductResponse, 'quantity'> {
  quantity?: number;
  stock?: number;
  discountPercentage?: number | null;
  isNew?: boolean;
}

interface ProductPage {
  content: BackendProductPayload[];
  pageNumber?: number;
  totalPages?: number;
}

const ADMIN_OVERRIDES_KEY = 'admin_product_overrides';
const ADMIN_LOCAL_PRODUCTS_KEY = 'admin_local_products';
const ADMIN_DELETED_IDS_KEY = 'admin_deleted_product_ids';

const MOCK_PRODUCTS: ProductResponse[] = [
  {
    id: 1001, name: 'iPhone 15 Pro', description: 'Ֆլագման սմարթֆոն 128GB հիշողությամբ', price: 650000, originalPrice: 730000, quantity: 12,
    imageUrl: 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?w=900&q=82&fit=crop&auto=format',
    rating: 4.9, reviewCount: 1847, badge: 'bestseller', spec: '128GB · A17 Pro chip',
    storageOptions: [{ label: '128GB', priceDelta: 0 }, { label: '256GB', priceDelta: 50000 }, { label: '512GB', priceDelta: 100000 }]
  },
  {
    id: 1002, name: 'Samsung Galaxy S24', description: 'Android սմարթֆոն 256GB հիշողությամբ', price: 520000, quantity: 8,
    imageUrl: 'https://images.unsplash.com/photo-1706372124814-417e2f0c3fe0?w=900&q=82&fit=crop&auto=format',
    rating: 4.6, reviewCount: 342, badge: 'new', spec: '256GB · Snapdragon 8 Gen 3',
    storageOptions: [{ label: '128GB', priceDelta: -50000 }, { label: '256GB', priceDelta: 0 }, { label: '512GB', priceDelta: 50000 }]
  },
  {
    id: 1003, name: 'MacBook Air M2', description: 'Թեթև և հզոր laptop՝ 13" էկրանով', price: 780000, quantity: 5,
    imageUrl: 'https://images.unsplash.com/photo-1651241680016-cc9e407e7dc3?w=900&q=82&fit=crop&auto=format',
    rating: 4.9, reviewCount: 963, badge: 'top-rated', spec: '8-core CPU · 16GB unified memory'
  },
  {
    id: 1004, name: 'ASUS ROG Notebook', description: 'Հզոր laptop՝ բարձր արտադրողականությամբ պրոցեսորով', price: 760000, quantity: 4,
    imageUrl: 'https://images.unsplash.com/photo-1771015310937-6754da25e49a?w=900&q=82&fit=crop&auto=format',
    rating: 4.4, reviewCount: 128, spec: '16GB RAM · RTX 4060'
  },
  {
    id: 1005, name: 'Sony WH-1000XM5', description: 'Անլար headphone՝ աղմուկի մեկուսացումով', price: 205000, originalPrice: 245000, quantity: 20,
    imageUrl: 'https://images.unsplash.com/photo-1612858249816-5a91a9fb9886?w=900&q=82&fit=crop&auto=format',
    rating: 4.8, reviewCount: 2210, badge: 'top-rated', spec: 'Ակտիվ աղմուկի մեկուսացում · 30ժ մարտկոց'
  },
  {
    id: 1006, name: 'AirPods Pro', description: 'Անլար earbud ականջակալներ', price: 115000, originalPrice: 145000, quantity: 30,
    imageUrl: 'https://images.unsplash.com/photo-1606741965429-8d76ff50bb2f?w=900&q=82&fit=crop&auto=format',
    rating: 4.7, reviewCount: 5430, badge: 'hot-deal', spec: 'ANC · MagSafe լիցքավորում'
  },
  {
    id: 1007, name: 'Samsung 55" QLED TV', description: 'Հեռուստացույց 4K լուծաչափով', price: 410000, quantity: 6,
    imageUrl: 'https://images.unsplash.com/photo-1615986200762-a1ed9610d3b1?w=900&q=82&fit=crop&auto=format',
    rating: 4.5, reviewCount: 89, spec: '4K QLED · 55"'
  },
  {
    id: 1008, name: 'JBL Flip Portable Speaker', description: 'Փոխադրելի Bluetooth speaker', price: 78000, quantity: 10,
    imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=900&q=82&fit=crop&auto=format',
    rating: 4.3, reviewCount: 64, spec: 'Bluetooth 5.1 · 12ժ մարտկոց'
  },
  {
    id: 1009, name: 'Canon EOS Camera', description: 'Ֆոտո camera սիրողականների համար', price: 410000, quantity: 7,
    imageUrl: 'https://images.unsplash.com/photo-1500634245200-e5245c7574ef?w=900&q=82&fit=crop&auto=format',
    rating: 4.6, reviewCount: 51, badge: 'new', spec: '24.1MP · 4K Video'
  },
  {
    id: 1010, name: 'GoPro Hero 12', description: 'Video action camera', price: 235000, originalPrice: 275000, quantity: 15,
    imageUrl: 'https://images.unsplash.com/photo-1604942177421-df466b7410f6?w=900&q=82&fit=crop&auto=format',
    rating: 4.5, reviewCount: 312, badge: 'hot-deal', spec: 'Waterproof · 5.3K Video'
  },
  {
    id: 1011, name: 'Samsung 27" Monitor', description: 'Մոնիտոր՝ QHD լուծաչափով, բարձր թարմացման հաճախությամբ', price: 175000, quantity: 9,
    imageUrl: 'https://images.unsplash.com/photo-1666771410255-158c17cf8ff8?w=900&q=82&fit=crop&auto=format',
    rating: 4.4, reviewCount: 76, spec: '27" QHD · 144Hz'
  },
  {
    id: 1012, name: 'iPad Air', description: 'Պլանշետ՝ M1 չիպով և Apple Pencil աջակցությամբ', price: 420000, quantity: 11,
    imageUrl: 'https://images.unsplash.com/photo-1527698266440-12104e498b76?w=900&q=82&fit=crop&auto=format',
    rating: 4.7, reviewCount: 540, spec: '256GB · M1 chip',
    storageOptions: [{ label: '128GB', priceDelta: -50000 }, { label: '256GB', priceDelta: 0 }, { label: '512GB', priceDelta: 50000 }]
  },
  {
    id: 1013, name: 'Apple Magic Keyboard', description: 'Անլար ստեղնաշար աքսեսուար', price: 58000, quantity: 25,
    imageUrl: 'https://images.unsplash.com/photo-1510674485131-dc88d96369b4?w=900&q=82&fit=crop&auto=format',
    rating: 4.5, reviewCount: 210, spec: 'Wireless · Bluetooth'
  },
  {
    id: 1014, name: 'Sony PlayStation 5', description: 'Խաղային կոնսուլ 825GB կրիչով', price: 285000, quantity: 8,
    imageUrl: 'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=900&q=82&fit=crop&auto=format',
    rating: 4.9, reviewCount: 1420, badge: 'bestseller', spec: '825GB SSD · 4K Gaming'
  },
  {
    id: 1015, name: 'Microsoft Xbox Series X', description: 'Խաղային կոնսուլ 1TB կրիչով', price: 290000, quantity: 6,
    imageUrl: 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=900&q=82&fit=crop&auto=format',
    rating: 4.8, reviewCount: 980, badge: 'new', spec: '1TB SSD · 4K · 120fps'
  },
  {
    id: 1016, name: 'DualSense Wireless Controller', description: 'Անլար խաղային վահանակ՝ հագեցած հպումային արձագանքով', price: 42000, quantity: 22,
    imageUrl: 'https://images.unsplash.com/photo-1649875951914-61057a5df533?w=900&q=82&fit=crop&auto=format',
    rating: 4.7, reviewCount: 610, spec: 'Հպումային հետադարձ կապ · Անլար'
  },
  {
    id: 1017, name: 'HyperX Cloud Gaming Headset', description: 'Ականջակալ՝ մարտկոցի երկար կյանքով և հստակ ձայնով', price: 70000, originalPrice: 88000, quantity: 14,
    imageUrl: 'https://images.unsplash.com/photo-1612858249784-5883876e0d52?w=900&q=82&fit=crop&auto=format',
    rating: 4.6, reviewCount: 340, badge: 'hot-deal', spec: '7.1 Surround · Անլար'
  },
  {
    id: 1018, name: 'ASUS TUF Gaming Curved Monitor', description: 'Մոնիտոր՝ 165Hz թարմացման հաճախությամբ և կորացած էկրանով', price: 270000, quantity: 7,
    imageUrl: 'https://images.unsplash.com/photo-1666771410003-8437c4781d49?w=900&q=82&fit=crop&auto=format',
    rating: 4.5, reviewCount: 95, spec: '34" Curved QHD · 165Hz'
  },
  {
    id: 1019, name: 'Google Pixel 8', description: 'Android հեռախոս 128GB հիշողությամբ', price: 430000, quantity: 10,
    imageUrl: 'https://images.unsplash.com/photo-1760604359549-8921b6139a1c?w=900&q=82&fit=crop&auto=format',
    rating: 4.6, reviewCount: 420, badge: 'new', spec: '128GB · Tensor G3 chip',
    storageOptions: [{ label: '128GB', priceDelta: 0 }, { label: '256GB', priceDelta: 50000 }, { label: '512GB', priceDelta: 100000 }]
  },
  {
    id: 1020, name: 'Xiaomi 14', description: 'Android հեռախոս 256GB հիշողությամբ', price: 500000, quantity: 9,
    imageUrl: 'https://images.unsplash.com/photo-1773414422122-96165e640180?w=900&q=82&fit=crop&auto=format',
    rating: 4.5, reviewCount: 310, spec: '256GB · Snapdragon 8 Gen 3',
    storageOptions: [{ label: '128GB', priceDelta: -50000 }, { label: '256GB', priceDelta: 0 }, { label: '512GB', priceDelta: 50000 }]
  },
  {
    id: 1021, name: 'OnePlus 12', description: 'Արագագործ հեռախոս 256GB հիշողությամբ', price: 495000, quantity: 7,
    imageUrl: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=900&q=82&fit=crop&auto=format',
    rating: 4.6, reviewCount: 275, spec: '256GB · Snapdragon 8 Gen 3',
    storageOptions: [{ label: '128GB', priceDelta: -50000 }, { label: '256GB', priceDelta: 0 }, { label: '512GB', priceDelta: 50000 }]
  },
  {
    id: 1022, name: 'Samsung Galaxy A55', description: 'Մատչելի Android սմարթֆոն', price: 235000, quantity: 15,
    imageUrl: 'https://images.unsplash.com/photo-1653179767387-35ce2dbdbb5d?w=900&q=82&fit=crop&auto=format',
    rating: 4.3, reviewCount: 190, spec: '128GB · Exynos 1480',
    storageOptions: [{ label: '128GB', priceDelta: 0 }, { label: '256GB', priceDelta: 50000 }, { label: '512GB', priceDelta: 100000 }]
  },
  {
    id: 1023, name: 'Dell XPS 13', description: 'Կոմպակտ laptop՝ 13" էկրանով', price: 715000, quantity: 6,
    imageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=900&q=82&fit=crop&auto=format',
    rating: 4.7, reviewCount: 410, badge: 'top-rated', spec: 'Intel Core i7 · 16GB RAM'
  },
  {
    id: 1024, name: 'Lenovo ThinkPad X1 Carbon', description: 'Բիզնես laptop՝ թեթև կորպուսով', price: 840000, quantity: 5,
    imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900&q=82&fit=crop&auto=format',
    rating: 4.6, reviewCount: 260, spec: 'Intel Core i7 · 32GB RAM'
  },
  {
    id: 1025, name: 'HP Pavilion 15', description: 'Ամենօրյա օգտագործման laptop', price: 305000, quantity: 12,
    imageUrl: 'https://images.unsplash.com/photo-1663354027456-ce6a7e07d212?w=900&q=82&fit=crop&auto=format',
    rating: 4.2, reviewCount: 340, spec: 'Intel Core i5 · 8GB RAM'
  },
  {
    id: 1026, name: 'Acer Aspire 5', description: 'Մատչելի գնով laptop', price: 255000, quantity: 14,
    imageUrl: 'https://images.unsplash.com/photo-1693206578613-144dd540b892?w=900&q=82&fit=crop&auto=format',
    rating: 4.1, reviewCount: 180, spec: 'AMD Ryzen 5 · 8GB RAM'
  },
  {
    id: 1027, name: 'LG OLED55 C3', description: 'OLED հեռուստացույց 4K լուծաչափով', price: 680000, quantity: 5,
    imageUrl: 'https://images.unsplash.com/photo-1689686998931-858488b0c62c?w=900&q=82&fit=crop&auto=format',
    rating: 4.8, reviewCount: 520, badge: 'top-rated', spec: '4K OLED · 55"'
  },
  {
    id: 1028, name: 'Sony Bravia 65" 4K', description: 'Հեռուստացույց Google TV հարթակով', price: 700000, quantity: 4,
    imageUrl: 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=900&q=82&fit=crop&auto=format',
    rating: 4.7, reviewCount: 265, spec: '4K HDR · 65" · Google TV'
  },
  {
    id: 1029, name: 'Xiaomi TV A2 50"', description: 'Հեռուստացույց Android TV հարթակով', price: 260000, quantity: 9,
    imageUrl: 'https://images.unsplash.com/photo-1780042731953-15dd1b3b5f00?w=900&q=82&fit=crop&auto=format',
    rating: 4.3, reviewCount: 150, badge: 'new', spec: '4K · 50" · Android TV'
  },
  {
    id: 1030, name: 'TCL 43" Smart TV', description: 'Մատչելի հեռուստացույց խելացի հնարավորություններով', price: 135000, quantity: 11,
    imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=900&q=82&fit=crop&auto=format',
    rating: 4.1, reviewCount: 98, spec: 'FHD · 43" · Smart TV'
  },
  {
    id: 1031, name: 'Samsung Crystal UHD 50"', description: 'Հեռուստացույց Crystal UHD տեխնոլոգիայով', price: 280000, quantity: 8,
    imageUrl: 'https://images.unsplash.com/photo-1552975084-6e027cd345c2?w=900&q=82&fit=crop&auto=format',
    rating: 4.4, reviewCount: 205, spec: '4K UHD · 50"'
  },
  {
    id: 1032, name: 'Bose QuietComfort Ultra', description: 'Անլար headphone՝ լավագույն աղմուկի մեկուսացումով', price: 215000, quantity: 10,
    imageUrl: 'https://images.unsplash.com/photo-1570132251442-d38a55360c44?w=900&q=82&fit=crop&auto=format',
    rating: 4.8, reviewCount: 890, badge: 'top-rated', spec: 'Ակտիվ աղմուկի մեկուսացում · 24ժ մարտկոց'
  },
  {
    id: 1033, name: 'JBL Tune 760NC', description: 'Ականջակալ՝ ակտիվ աղմուկի մեկուսացումով', price: 65000, originalPrice: 82000, quantity: 25,
    imageUrl: 'https://images.unsplash.com/photo-1579065560489-989b0cc394ce?w=900&q=82&fit=crop&auto=format',
    rating: 4.4, reviewCount: 610, badge: 'hot-deal', spec: 'ANC · 50ժ մարտկոց'
  },
  {
    id: 1034, name: 'Beats Studio Pro', description: 'Անլար headphone Apple չիպով', price: 165000, quantity: 12,
    imageUrl: 'https://images.pexels.com/photos/6023144/pexels-photo-6023144.jpeg?auto=compress&cs=tinysrgb&w=900',
    rating: 4.5, reviewCount: 430, spec: 'ANC · Ուղեկցող Apple/Android'
  },
  {
    id: 1035, name: 'Nintendo Switch OLED', description: 'Խաղային կոնսուլ՝ շարժական և կանգնակի ռեժիմներով', price: 205000, quantity: 13,
    imageUrl: 'https://images.unsplash.com/photo-1591182136289-67ff16828fd4?w=900&q=82&fit=crop&auto=format',
    rating: 4.8, reviewCount: 1650, badge: 'bestseller', spec: '64GB · 7" OLED էկրան'
  },
  {
    id: 1036, name: 'Samsung Tab S9', description: 'Պլանշետ S Pen գրիչով', price: 400000, quantity: 8,
    imageUrl: 'https://images.unsplash.com/photo-1661595677185-06202000a195?w=900&q=82&fit=crop&auto=format',
    rating: 4.6, reviewCount: 320, spec: '256GB · S Pen',
    storageOptions: [{ label: '128GB', priceDelta: -50000 }, { label: '256GB', priceDelta: 0 }, { label: '512GB', priceDelta: 50000 }]
  },
  {
    id: 1037, name: 'Lenovo Tab P11', description: 'Պլանշետ՝ մեծ մարտկոցով', price: 155000, quantity: 11,
    imageUrl: 'https://images.unsplash.com/photo-1675109322863-2f4eef9fe032?w=900&q=82&fit=crop&auto=format',
    rating: 4.2, reviewCount: 140, spec: '128GB · 13ժ մարտկոց',
    storageOptions: [{ label: '128GB', priceDelta: 0 }, { label: '256GB', priceDelta: 50000 }, { label: '512GB', priceDelta: 100000 }]
  },
  {
    id: 1038, name: 'Xiaomi Pad 6', description: 'Պլանշետ՝ բարձր արագագործությամբ', price: 210000, quantity: 9,
    imageUrl: 'https://images.pexels.com/photos/35300031/pexels-photo-35300031.jpeg?auto=compress&cs=tinysrgb&w=900',
    rating: 4.4, reviewCount: 175, badge: 'new', spec: '256GB · 144Hz էկրան',
    storageOptions: [{ label: '128GB', priceDelta: -50000 }, { label: '256GB', priceDelta: 0 }, { label: '512GB', priceDelta: 50000 }]
  },
  {
    id: 1039, name: 'Huawei MatePad 11', description: 'Պլանշետ՝ ստիլուսի աջակցությամբ', price: 185000, quantity: 7,
    imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=900&q=82&fit=crop&auto=format',
    rating: 4.3, reviewCount: 110, spec: '128GB · 120Hz էկրան',
    storageOptions: [{ label: '128GB', priceDelta: 0 }, { label: '256GB', priceDelta: 50000 }, { label: '512GB', priceDelta: 100000 }]
  },
  {
    id: 1040, name: 'Microsoft Surface Go 3', description: 'Պլանշետ՝ հանվող ստեղնաշարի աջակցությամբ', price: 250000, quantity: 6,
    imageUrl: 'https://images.unsplash.com/photo-1617780421749-ebd0ef657b2e?w=900&q=82&fit=crop&auto=format',
    rating: 4.1, reviewCount: 95, spec: '128GB · Windows 11',
    storageOptions: [{ label: '128GB', priceDelta: 0 }, { label: '256GB', priceDelta: 50000 }, { label: '512GB', priceDelta: 100000 }]
  },
  {
    id: 1041, name: 'Logitech MX Master 3S', description: 'Անլար mouse՝ բարձր ճշգրտությամբ', price: 58000, quantity: 20,
    imageUrl: 'https://images.unsplash.com/photo-1625750435936-f97e1748410b?w=900&q=82&fit=crop&auto=format',
    rating: 4.8, reviewCount: 720, badge: 'top-rated', spec: '8000 DPI · Անլար'
  },
  {
    id: 1042, name: 'Anker 20W Charger', description: 'Արագ charger՝ 20W հզորությամբ', price: 14000, quantity: 40,
    imageUrl: 'https://images.unsplash.com/photo-1705147290571-dde8fb73cf98?w=900&q=82&fit=crop&auto=format',
    rating: 4.6, reviewCount: 980, spec: 'USB-C · 20W'
  },
  {
    id: 1043, name: 'USB-C to USB-C Cable', description: 'Cable՝ արագ լիցքավորման և տվյալների փոխանցման համար', price: 8000, quantity: 60,
    imageUrl: 'https://images.unsplash.com/photo-1619459072761-496c0812331b?w=900&q=82&fit=crop&auto=format',
    rating: 4.4, reviewCount: 340, spec: '1.5մ · 100W'
  },
  {
    id: 1044, name: 'Protective Sleeve Case 15"', description: 'Պաշտպանիչ պատյան 15 դյույմանոց սարքերի համար', price: 18000, quantity: 22,
    imageUrl: 'https://images.unsplash.com/photo-1657603571233-5e9860e96d00?w=900&q=82&fit=crop&auto=format',
    rating: 4.5, reviewCount: 160, spec: '15" · Ջրակայուն'
  },
  {
    id: 1045, name: 'Wireless Charger Pad', description: 'Անլար charger՝ Qi տեխնոլոգիայով', price: 17000, quantity: 30,
    imageUrl: 'https://images.unsplash.com/photo-1591290619618-904f6dd935e3?w=900&q=82&fit=crop&auto=format',
    rating: 4.3, reviewCount: 210, spec: '15W · Qi'
  },
  {
    id: 1046, name: 'Sony Alpha a6400', description: 'Հայելային camera լուսանկարիչների համար', price: 510000, quantity: 5,
    imageUrl: 'https://images.unsplash.com/photo-1722842179244-b4a90215d04e?w=900&q=82&fit=crop&auto=format',
    rating: 4.7, reviewCount: 145, spec: '24.2MP · 4K Video'
  },
  {
    id: 1047, name: 'Sonos Amp', description: 'Ուժեղացուցիչ՝ խելացի ձայնային համակարգի համար', price: 380000, quantity: 6,
    imageUrl: 'https://images.unsplash.com/photo-1743521442683-08ffd8ac9e14?w=900&q=82&fit=crop&auto=format',
    rating: 4.5, reviewCount: 88, spec: '125W · Wi-Fi'
  },
  {
    id: 1048, name: 'Apple iPhone 14', description: 'Հզոր սմարթֆոն 128GB հիշողությամբ', price: 480000, quantity: 11,
    imageUrl: 'https://images.unsplash.com/photo-1574755393849-623942496936?w=900&q=82&fit=crop&auto=format',
    rating: 4.7, reviewCount: 980, spec: '128GB · A15 Bionic chip'
  },
  {
    id: 1049, name: 'Huawei P60 Pro', description: 'Հզոր հեռախոս գերժամանակակից տեսախցիկով', price: 470000, quantity: 6,
    imageUrl: 'https://images.unsplash.com/photo-1546706887-a24528987a75?w=900&q=82&fit=crop&auto=format',
    rating: 4.4, reviewCount: 165, badge: 'new', spec: '256GB · Snapdragon 8+ Gen 1'
  },
  {
    id: 1050, name: 'MacBook Pro M3', description: 'Հզոր laptop՝ 14" Liquid Retina XDR էկրանով', price: 1150000, quantity: 4,
    imageUrl: 'https://images.unsplash.com/photo-1629131726692-1accd0c53ce0?w=900&q=82&fit=crop&auto=format',
    rating: 4.9, reviewCount: 615, badge: 'top-rated', spec: 'M3 Pro chip · 18GB RAM'
  },
  {
    id: 1051, name: 'ASUS Zenbook 14', description: 'Նրբագեղ laptop՝ թեթև և հզոր', price: 455000, quantity: 10,
    imageUrl: 'https://images.unsplash.com/photo-1693206816304-642a705045a1?w=900&q=82&fit=crop&auto=format',
    rating: 4.3, reviewCount: 210, spec: 'Intel Core i5 · 16GB RAM'
  },
  {
    id: 1052, name: 'Hisense 55" ULED TV', description: 'Հեռուստացույց ULED տեխնոլոգիայով', price: 340000, quantity: 8,
    imageUrl: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=900&q=82&fit=crop&auto=format',
    rating: 4.3, reviewCount: 132, spec: '4K ULED · 55"'
  },
  {
    id: 1053, name: 'Panasonic 43" 4K TV', description: 'Մատչելի 4K հեռուստացույց', price: 195000, quantity: 10,
    imageUrl: 'https://images.unsplash.com/photo-1567690187548-f07b1d7bf5a9?w=900&q=82&fit=crop&auto=format',
    rating: 4.2, reviewCount: 87, spec: '4K UHD · 43"'
  },
  {
    id: 1054, name: 'Sennheiser Momentum 4', description: 'Անլար headphone բարձրորակ ձայնով', price: 185000, quantity: 9,
    imageUrl: 'https://images.unsplash.com/photo-1754142654796-cafbcb9f633b?w=900&q=82&fit=crop&auto=format',
    rating: 4.7, reviewCount: 305, badge: 'top-rated', spec: 'ANC · 60ժ մարտկոց'
  },
  {
    id: 1055, name: 'Samsung Buds2 Pro', description: 'Անլար earbud ականջակալներ', price: 95000, originalPrice: 115000, quantity: 18,
    imageUrl: 'https://images.pexels.com/photos/19320592/pexels-photo-19320592.jpeg?auto=compress&cs=tinysrgb&w=900',
    rating: 4.5, reviewCount: 520, badge: 'hot-deal', spec: 'ANC · IPX7'
  },
  {
    id: 1056, name: 'Xbox Wireless Controller', description: 'Անլար խաղային վահանակ Xbox կոնսուլների համար', price: 39000, quantity: 24,
    imageUrl: 'https://images.unsplash.com/photo-1615556626922-68da0c9f4350?w=900&q=82&fit=crop&auto=format',
    rating: 4.7, reviewCount: 890, spec: 'Անլար · Bluetooth'
  },
  {
    id: 1057, name: 'Steam Deck', description: 'Խաղային կոնսուլ՝ ներկառուցված էկրանով', price: 340000, quantity: 5,
    imageUrl: 'https://images.pexels.com/photos/12670693/pexels-photo-12670693.jpeg?auto=compress&cs=tinysrgb&w=900',
    rating: 4.6, reviewCount: 275, badge: 'new', spec: '512GB · 7" էկրան'
  },
  {
    id: 1058, name: 'Apple iPad 10th Gen', description: 'Պլանշետ՝ A14 չիպով', price: 245000, quantity: 13,
    imageUrl: 'https://images.unsplash.com/photo-1659748097081-3d2c4c92fec7?w=900&q=82&fit=crop&auto=format',
    rating: 4.6, reviewCount: 720, spec: '64GB · A14 Bionic chip'
  },
  {
    id: 1059, name: 'Amazon Fire HD 10', description: 'Պլանշետ՝ մատչելի գնով', price: 95000, quantity: 20,
    imageUrl: 'https://images.unsplash.com/photo-1629131704989-c74179b0ce16?w=900&q=82&fit=crop&auto=format',
    rating: 4.0, reviewCount: 310, badge: 'hot-deal', originalPrice: 115000, spec: '32GB · 10.1" HD'
  },
  {
    id: 1060, name: 'Logitech G502 Mouse', description: 'Ճշգրիտ mouse՝ բազմաթիվ ծրագրավորվող կոճակներով', price: 46000, quantity: 26,
    imageUrl: 'https://images.unsplash.com/photo-1762180463317-b5e7886b38c1?w=900&q=82&fit=crop&auto=format',
    rating: 4.7, reviewCount: 940, spec: '25600 DPI · Անլար'
  },
  {
    id: 1061, name: 'Anker Power Bank 10000mAh', description: 'Շարժական charger՝ 10000mAh հզորությամբ', price: 23000, quantity: 35,
    imageUrl: 'https://images.unsplash.com/photo-1706275399494-fb26bbc5da63?w=900&q=82&fit=crop&auto=format',
    rating: 4.6, reviewCount: 610, spec: '10000mAh · USB-C'
  },
  {
    id: 1062, name: 'MacBook Air M1', description: 'Թեթև laptop՝ 13" էկրանով, մատչելի Apple chip-ով', price: 730000, quantity: 8,
    imageUrl: 'https://images.unsplash.com/photo-1484788984921-03950022c9ef?w=900&q=82&fit=crop&auto=format',
    rating: 4.7, reviewCount: 780, spec: '8-core CPU · 8GB unified memory'
  },
  {
    id: 1063, name: 'MacBook Pro M4', description: 'Հզոր laptop՝ 14" Liquid Retina XDR էկրանով, M4 սերնդի չիպով', price: 1280000, quantity: 4,
    imageUrl: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=900&q=82&fit=crop&auto=format',
    rating: 4.9, reviewCount: 210, badge: 'new', spec: 'M4 Pro chip · 24GB RAM'
  },
  {
    id: 1064, name: 'iPhone 17 Pro', description: 'Ֆլագման սմարթֆոն 256GB հիշողությամբ', price: 580000, quantity: 9,
    imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=900&q=82&fit=crop&auto=format',
    rating: 4.8, reviewCount: 45, badge: 'new', spec: '256GB · A19 Pro chip',
    storageOptions: [{ label: '256GB', priceDelta: 0 }, { label: '512GB', priceDelta: 70000 }, { label: '1TB', priceDelta: 150000 }],
    simOptions: ['Dual eSIM', 'Nano-SIM & eSIM'],
    colorVariants: [
      { label: 'Space Gray', imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=900&q=82&fit=crop&auto=format' },
      { label: 'Silver', imageUrl: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=900&q=82&fit=crop&auto=format' },
      { label: 'Deep Blue', imageUrl: 'https://images.unsplash.com/photo-1607936854279-55e8a4c64888?w=900&q=82&fit=crop&auto=format' }
    ]
  },
  {
    id: 1065, name: 'iPhone 17 Pro Max', description: 'Ֆլագման Max մոդել՝ 256GB հիշողությամբ և մեծ էկրանով', price: 680000, quantity: 6,
    imageUrl: 'https://images.unsplash.com/photo-1607936854279-55e8a4c64888?w=900&q=82&fit=crop&auto=format',
    rating: 4.9, reviewCount: 28, badge: 'new', spec: '256GB · A19 Pro chip · Max display',
    storageOptions: [{ label: '256GB', priceDelta: 0 }, { label: '512GB', priceDelta: 70000 }, { label: '1TB', priceDelta: 150000 }],
    simOptions: ['Dual eSIM', 'Nano-SIM & eSIM'],
    colorVariants: [
      { label: 'Deep Blue', imageUrl: 'https://images.unsplash.com/photo-1607936854279-55e8a4c64888?w=900&q=82&fit=crop&auto=format' },
      { label: 'Space Gray', imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=900&q=82&fit=crop&auto=format' },
      { label: 'Silver', imageUrl: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=900&q=82&fit=crop&auto=format' }
    ]
  }
];

@Injectable({
  providedIn: 'root'
})
export class Product {
  private apiUrl = `${environment.productApiUrl}/api/products`;

  constructor(private http: HttpClient, private authService: Auth) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  private isUnreachable(err: unknown): err is HttpErrorResponse {
    return err instanceof HttpErrorResponse && err.status === 0;
  }

  private isAdminEndpointUnavailable(err: unknown): boolean {
    return this.isUnreachable(err) || (err instanceof HttpErrorResponse && err.status === 404);
  }

  private readOverrides(): Record<number, { price?: number; originalPrice?: number | null }> {
    try {
      const raw = localStorage.getItem(ADMIN_OVERRIDES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private writeOverrides(overrides: Record<number, { price?: number; originalPrice?: number | null }>): void {
    localStorage.setItem(ADMIN_OVERRIDES_KEY, JSON.stringify(overrides));
  }

  private applyOverrides(products: ProductResponse[]): ProductResponse[] {
    const overrides = this.readOverrides();
    if (Object.keys(overrides).length === 0) return products;
    return products.map(product => {
      const override = overrides[product.id];
      if (!override) return product;
      return {
        ...product,
        price: override.price ?? product.price,
        originalPrice: override.originalPrice === null ? undefined : (override.originalPrice ?? product.originalPrice)
      };
    });
  }

  private readLocalProducts(): ProductResponse[] {
    try {
      const raw = localStorage.getItem(ADMIN_LOCAL_PRODUCTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private writeLocalProducts(products: ProductResponse[]): void {
    localStorage.setItem(ADMIN_LOCAL_PRODUCTS_KEY, JSON.stringify(products));
  }

  private addLocalProduct(product: ProductResponse): void {
    const products = this.readLocalProducts();
    products.unshift(product);
    this.writeLocalProducts(products);
  }

  private readDeletedIds(): number[] {
    try {
      const raw = localStorage.getItem(ADMIN_DELETED_IDS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private markDeleted(productId: number): void {
    const ids = this.readDeletedIds();
    if (!ids.includes(productId)) {
      ids.push(productId);
      localStorage.setItem(ADMIN_DELETED_IDS_KEY, JSON.stringify(ids));
    }

    this.writeLocalProducts(this.readLocalProducts().filter(p => p.id !== productId));
  }

  private applyLocalAdditionsAndDeletions(products: ProductResponse[]): ProductResponse[] {
    const deleted = new Set(this.readDeletedIds());
    const withoutDeleted = deleted.size === 0 ? products : products.filter(p => !deleted.has(p.id));
    const localAdditions = this.readLocalProducts().filter(p => !deleted.has(p.id));
    return [...localAdditions, ...withoutDeleted];
  }

  // Relative imageUrl paths are resolved against the product API's own origin.
  private resolveImageUrl(imageUrl?: string): string | undefined {
    if (!imageUrl) return imageUrl;
    if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
    const origin = new URL(this.apiUrl).origin;
    return `${origin}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  }

  private normalizeProduct(raw: BackendProductPayload): ProductResponse {
    const discountPercentage = raw.discountPercentage;
    const derivedOriginalPrice = discountPercentage && discountPercentage > 0
      ? Math.round(raw.price / (1 - discountPercentage / 100))
      : undefined;
    return {
      ...raw,
      quantity: raw.quantity ?? raw.stock ?? 0,
      imageUrl: this.resolveImageUrl(raw.imageUrl),
      originalPrice: raw.originalPrice ?? derivedOriginalPrice,
      // The backend has no notion of a "badge" — it only flags `isNew`. Map
      // that onto the same badge mock products already use, so newly added
      // products get a "New" badge automatically instead of needing one
      // hardcoded per product.
      badge: raw.badge ?? (raw.isNew ? 'new' : undefined),
    };
  }

  // The live backend paginates list responses as { content: [...], pageNumber, pageSize,
  // totalPages, ... } instead of returning a bare array; accept either shape. A bare array
  // is treated as already being the complete list (totalPages: 1).
  private extractPage(data: unknown): { content: BackendProductPayload[]; totalPages: number } | null {
    if (Array.isArray(data)) return { content: data as BackendProductPayload[], totalPages: 1 };
    if (data && typeof data === 'object' && Array.isArray((data as ProductPage).content)) {
      const page = data as ProductPage;
      return { content: page.content, totalPages: page.totalPages ?? 1 };
    }
    return null;
  }

  private assertIsProduct(response: ApiResponse<BackendProductPayload>, url: string): ApiResponse<BackendProductPayload> {
    if (typeof response.data?.imageUrl !== 'string') {
      throw new HttpErrorResponse({ url, status: 0 });
    }
    return response;
  }

  // The backend paginates with a default page size (20), so a single unparameterized
  // request only returns the first page. Fetch the first page, then use its totalPages
  // to pull the remaining pages in parallel and concatenate them into the full catalog.
  getAllProducts(): Observable<ApiResponse<ProductResponse[]>> {
    return this.http.get<ApiResponse<unknown>>(this.apiUrl, { headers: this.getHeaders() }).pipe(
      switchMap(response => {
        const firstPage = this.extractPage(response.data);
        if (!firstPage) {
          throw new HttpErrorResponse({ url: this.apiUrl, status: 0 });
        }
        if (firstPage.totalPages <= 1) {
          return of(firstPage.content);
        }
        const remainingPages = Array.from({ length: firstPage.totalPages - 1 }, (_, i) =>
          this.http.get<ApiResponse<unknown>>(this.apiUrl, {
            headers: this.getHeaders(),
            params: { page: String(i + 1) }
          }).pipe(map(pageResponse => this.extractPage(pageResponse.data)?.content ?? []))
        );
        return forkJoin(remainingPages).pipe(map(pages => [firstPage.content, ...pages].flat()));
      }),
      map(products => ({ success: true, message: 'ok', data: products.map(p => this.normalizeProduct(p)) })),
      map(response => ({ ...response, data: this.applyLocalAdditionsAndDeletions(response.data) })),
      catchError(err => {
        if (this.isUnreachable(err)) {
          console.warn(`[Product] Backend at ${this.apiUrl} is unreachable or returned an unexpected response shape — using local mock data for development.`);
          return of({ success: true, message: 'mock', data: this.applyLocalAdditionsAndDeletions(this.applyOverrides(MOCK_PRODUCTS)) });
        }
        return throwError(() => err);
      })
    );
  }

  createProduct(request: { name: string; category: string; price: number; spec: string; imageUrl: string }): Observable<ApiResponse<ProductResponse>> {
    const body = {
      name: request.name,
      description: request.spec,
      price: request.price,
      stock: 100,
      category: request.category,
      imageUrl: request.imageUrl,
      isNew: true
    };
    return this.http.post<ApiResponse<BackendProductPayload>>(this.apiUrl, body, { headers: this.getHeaders() }).pipe(
      map(response => ({ ...response, data: { ...this.normalizeProduct(response.data), category: request.category, imageUrl: request.imageUrl, spec: request.spec } })),
      catchError(err => {
        if (this.isUnreachable(err)) {
          console.warn(`[Product] Backend at ${this.apiUrl} is unreachable — adding this product locally for development.`);
          const localProduct: ProductResponse = {
            id: -Date.now(),
            name: request.name,
            description: request.spec,
            price: request.price,
            quantity: 100,
            category: request.category,
            imageUrl: request.imageUrl,
            spec: request.spec
          };
          this.addLocalProduct(localProduct);
          return of({ success: true, message: 'mock', data: localProduct });
        }
        return throwError(() => err);
      })
    );
  }

  deleteProduct(productId: number): Observable<ApiResponse<null>> {
    const url = `${this.apiUrl}/${productId}`;
    return this.http.delete<ApiResponse<null>>(url, { headers: this.getHeaders() }).pipe(
      tap(() => this.markDeleted(productId)),
      catchError(err => {
        if (this.isUnreachable(err) || (err instanceof HttpErrorResponse && err.status === 404)) {
          console.warn(`[Product] Backend at ${url} is unreachable or the product wasn't found there — removing it locally for development.`);
          this.markDeleted(productId);
          return of({ success: true, message: 'mock', data: null });
        }
        return throwError(() => err);
      })
    );
  }

  getProductById(productId: number): Observable<ApiResponse<ProductResponse>> {
    const url = `${this.apiUrl}/${productId}`;
    return this.http.get<ApiResponse<BackendProductPayload>>(url, { headers: this.getHeaders() }).pipe(
      map(response => this.assertIsProduct(response, url)),
      map(response => ({ ...response, data: this.normalizeProduct(response.data) })),
      catchError(err => {
        const fallbackEligible = this.isUnreachable(err) || (err instanceof HttpErrorResponse && err.status === 404);
        const mockMatch = fallbackEligible ? MOCK_PRODUCTS.find(p => p.id === productId) : undefined;
        if (mockMatch) {
          console.warn(`[Product] Backend at ${this.apiUrl} is unreachable or returned an unexpected response shape — using local mock data for development.`);
          return of({ success: true, message: 'mock', data: this.applyOverrides([mockMatch])[0] });
        }
        return throwError(() => err);
      })
    );
  }

  updateProductPrice(productId: number, price: number): Observable<ApiResponse<ProductResponse>> {
    const url = `${this.apiUrl}/${productId}/price`;
    return this.http.put<ApiResponse<BackendProductPayload>>(url, { price }, { headers: this.getHeaders() }).pipe(
      map(response => ({ ...response, data: this.normalizeProduct(response.data) })),
      catchError(err => {
        if (this.isAdminEndpointUnavailable(err)) {
          console.warn(`[Product] Backend at ${url} is unreachable or not implemented yet — saving this edit locally for development.`);
          const overrides = this.readOverrides();
          overrides[productId] = { ...overrides[productId], price };
          this.writeOverrides(overrides);
          const base = MOCK_PRODUCTS.find(p => p.id === productId);
          if (base) {
            return of({ success: true, message: 'mock', data: this.applyOverrides([base])[0] });
          }
        }
        return throwError(() => err);
      })
    );
  }

  updateProductDiscount(productId: number, discountPercent: number | null): Observable<ApiResponse<ProductResponse>> {
    const url = `${this.apiUrl}/${productId}/discount`;
    return this.http.put<ApiResponse<BackendProductPayload>>(url, { discountPercentage: discountPercent }, { headers: this.getHeaders() }).pipe(
      map(response => ({ ...response, data: this.normalizeProduct(response.data) })),
      catchError(err => {
        if (this.isAdminEndpointUnavailable(err)) {
          console.warn(`[Product] Backend at ${url} is unreachable or not implemented yet — saving this edit locally for development.`);
          const base = MOCK_PRODUCTS.find(p => p.id === productId);
          if (base) {
            const overrides = this.readOverrides();
            const currentPrice = overrides[productId]?.price ?? base.price;
            const originalPrice = discountPercent && discountPercent > 0
              ? Math.round(currentPrice / (1 - discountPercent / 100))
              : null;
            overrides[productId] = { ...overrides[productId], originalPrice };
            this.writeOverrides(overrides);
            return of({ success: true, message: 'mock', data: this.applyOverrides([base])[0] });
          }
        }
        return throwError(() => err);
      })
    );
  }
}
