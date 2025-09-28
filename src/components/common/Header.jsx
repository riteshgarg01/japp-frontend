import React, { useEffect, useState } from "react";
import { Phone, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getConfig, waLink } from "@/shared";
import { Link, useLocation } from "react-router-dom";

const WhatsAppIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
    <path d="M14.25 12.35c-.3-.18-.68-.14-.93.1l-.26.25c-.2.2-.52.25-.77.12-.77-.38-1.4-.96-1.84-1.7-.15-.25-.12-.57.08-.78l.28-.28c.24-.24.3-.61.14-.92l-.57-1.14c-.2-.38-.63-.59-1.05-.5-.42.08-.74.41-.84.83-.18.77.07 1.66.7 2.6.83 1.23 1.9 2.2 3.12 2.87.89.48 1.8.73 2.58.54.41-.1.73-.42.81-.84.09-.42-.1-.84-.47-1.04Z" />
  </svg>
);

export default function Header(){
  const [brand, setBrand] = useState("Arohi's Collection");
  const [logo, setLogo] = useState("/logo.svg");
  const [ownerPhone, setOwnerPhone] = useState("");
  const location = useLocation();
  const isOwnerView = location?.pathname?.startsWith("/owner");
  useEffect(()=>{
    getConfig()
      .then(c=>{
        if(c.brand_name) setBrand(c.brand_name);
        if(c.logo_url) setLogo(c.logo_url);
        if(c.owner_phone) setOwnerPhone(c.owner_phone);
      })
      .catch(()=>{});
  }, []);

  const handleChat = () => {
    if (!ownerPhone) return;
    const message = brand ? `Hi ${brand}! I'm interested in your collection.` : "Hi there! I'm interested in your collection.";
    const url = waLink(ownerPhone, message);
    const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
    if (isMobile) {
      window.location.href = url;
    } else {
      const popup = window.open(url, "_blank");
      if (!popup) { window.location.href = url; }
    }
  };

  const handleCall = () => {
    if (!ownerPhone) return;
    const tel = ownerPhone.replace(/[^+\d]/g, "");
    if (!tel) return;
    window.location.href = `tel:${tel}`;
  };
  return (
    <div className="border-b bg-white">
      <div className="relative mx-auto max-w-6xl p-3 flex items-center justify-center select-none">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Brand logo" className="h-9 w-9 object-contain" />
          <div className="font-semibold tracking-tight text-lg">{brand}</div>
        </div>
        {!isOwnerView && ownerPhone && (
          <div className="absolute right-3 flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleCall} aria-label="Call the owner">
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleChat} aria-label="Chat on WhatsApp">
              <WhatsAppIcon className="h-5 w-5" />
            </Button>
          </div>
        )}
        {isOwnerView && (
          <div className="absolute right-3 flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" aria-label="Open shop view">
              <Link to="/shop">
                <Store className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
