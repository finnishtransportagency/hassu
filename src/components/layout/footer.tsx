import Image from "next/image";
import React from "react";

export const Footer = ({}) => {
  return (
    <div className="bg-warmWhite w-full self-start mt-auto">
      <footer className="mt-4 container">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 py-3">
          <div className="col-span-4">
            <Image src="/vayla-600px.jpg" alt="Väylä" width="100" height="100" />
            <Image src="/ely-400px.png" alt="ELY" width="100" height="100" />
            <p>
              Hankesuunnitelmista lorem ipsum-teksti tähän, joka kertoo lyhyesti mitä tämä sivusto pitää sisällään.
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Magnam dicta voluptatem fugit quos praesentium
              architecto accusamus non earum fuga veritatis, quia facilis est repellendus et iste similique beatae
              perferendis totam?
            </p>
            <a href="#">Hankesuunnittelusivu</a>
            <h3 className="font-light mt-3">Oikopolut</h3>
            <a href="#">Etäkäyttö (Extranet-palvelut, VPN-etäyhteys, intra)</a>
          </div>
          <div className="col-span-8 flex md:items-end md:space-x-4 place-content-end flex-col md:flex-row">
            <a href="#">Saavutettavuus</a>
            <a href="#">Tietoa sivustosta</a>
            <a href="#">Tietosuoja</a>
            <a href="#">Palautelomake</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
