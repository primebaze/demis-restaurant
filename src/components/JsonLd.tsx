// Restaurant structured data (JSON-LD) for Google rich results
export function JsonLd() {
  const restaurantSchema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: "Demi's Restaurant",
    image: "https://demisrestaurant.co.uk/og-image.jpg",
    url: "https://demisrestaurant.co.uk",
    telephone: "+442039046977",
    email: "bookings@demisrestaurant.co.uk",
    address: {
      "@type": "PostalAddress",
      streetAddress: "89 Cricklewood Broadway",
      addressLocality: "London",
      addressRegion: "Greater London",
      postalCode: "NW2 3JG",
      addressCountry: "GB",
    },
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
        closes: "23:00",
      },
    ],
    servesCuisine: ["Nigerian", "African", "West African"],
    priceRange: "££",
    acceptsReservations: "True",
    menu: "https://demisrestaurant.co.uk/menu",
    hasMenu: {
      "@type": "Menu",
      url: "https://demisrestaurant.co.uk/menu",
      name: "Main Menu",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "120",
    },
    sameAs: [
      "https://www.instagram.com/demisrestaurant/",
      "https://www.facebook.com/demisrestaurant/",
    ],
    potentialAction: {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://demisrestaurant.co.uk/booking",
      },
      result: {
        "@type": "Reservation",
        name: "Table reservation",
      },
    },
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Demi's Restaurant",
    image: "https://demisrestaurant.co.uk/og-image.jpg",
    "@id": "https://demisrestaurant.co.uk",
    url: "https://demisrestaurant.co.uk",
    telephone: "+442039046977",
    address: {
      "@type": "PostalAddress",
      streetAddress: "89 Cricklewood Broadway",
      addressLocality: "London",
      addressRegion: "Greater London",
      postalCode: "NW2 3JG",
      addressCountry: "GB",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 51.555033,
      longitude: -0.213608,
    },
    areaServed: {
      "@type": "City",
      name: "London",
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://demisrestaurant.co.uk",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Menu",
        item: "https://demisrestaurant.co.uk/menu",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "About",
        item: "https://demisrestaurant.co.uk/about",
      },
      {
        "@type": "ListItem",
        position: 4,
        name: "Contact",
        item: "https://demisrestaurant.co.uk/contact",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
