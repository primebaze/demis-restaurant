export function JsonLd() {
  const restaurantSchema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": "https://www.demisrestaurant.co.uk",
    name: "Demi's Restaurant",
    image: "https://www.demisrestaurant.co.uk/og-image.jpg",
    url: "https://www.demisrestaurant.co.uk",
    telephone: "+442039046977",
    email: "bookings@demisrestaurant.co.uk",
    address: [
      {
        "@type": "PostalAddress",
        streetAddress: "89 Cricklewood Broadway",
        addressLocality: "London",
        addressRegion: "Greater London",
        postalCode: "NW2 3JG",
        addressCountry: "GB",
      },
      {
        "@type": "PostalAddress",
        streetAddress: "67 Streatham Hill",
        addressLocality: "London",
        addressRegion: "Greater London",
        postalCode: "SW2 4TX",
        addressCountry: "GB",
      },
    ],
    geo: {
      "@type": "GeoCoordinates",
      latitude: 51.555033,
      longitude: -0.213608,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "12:00",
        closes: "00:00",
      },
    ],
    servesCuisine: ["Nigerian", "African", "West African"],
    priceRange: "££",
    acceptsReservations: true,
    menu: "https://www.demisrestaurant.co.uk/menu",
    hasMenu: {
      "@type": "Menu",
      url: "https://www.demisrestaurant.co.uk/menu",
      name: "Main Menu",
    },
    areaServed: {
      "@type": "City",
      name: "London",
    },
    sameAs: [
      "https://www.instagram.com/demisrestaurant/",
      "https://www.facebook.com/demisrestaurant/",
    ],
    potentialAction: {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://www.demisrestaurant.co.uk/booking",
      },
      result: {
        "@type": "Reservation",
        name: "Table reservation",
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantSchema) }}
    />
  );
}
