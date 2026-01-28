import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function ProfileNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <Image
          src="/icons/7486744.png"
          alt="Олдсонгүй"
          width={80}
          height={80}
          className="mx-auto mb-4 opacity-70"
        />
        <h1 className="text-xl md:text-2xl font-bold mb-4">Профайл олдсонгүй</h1>
        <Link href="/">
          <Button>Нүүр хуудас руу буцах</Button>
        </Link>
      </div>
    </div>
  );
}
