import Image from "next/image";
import Link from "next/link"; 
import { Inter, Roboto_Mono } from "next/font/google";
import { Authenticator } from "@aws-amplify/ui-react";
import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";

// Initialize the fonts
const geistSans = Inter({ subsets: ["latin"] });
const geistMono = Roboto_Mono({ subsets: ["latin"] });

const client = generateClient<Schema>();

export default function AmbulancesPage() {
  const [ambulances, setAmbulances] = useState<Array<Schema["Ambulance"]["type"]>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial query
    const fetchAmbulances = async () => {
      try {
        const { data } = await client.models.Ambulance.list({
          filter: {
            status: { eq: "available" }
          }
        });
        setAmbulances(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching ambulances:", error);
        setLoading(false);
      }
    };

    fetchAmbulances();


    const updateSubscription = client.models.Ambulance.onUpdate().subscribe({
      next: (updatedAmbulance) => {
        console.log("Ambulance updated:", updatedAmbulance);
        setAmbulances(prev => {
          if (updatedAmbulance.status === "available") {
            // Check if ambulance is already in the list
            const exists = prev.some(amb => amb.id === updatedAmbulance.id);
            if (exists) {
              // Update existing ambulance
              return prev.map(amb => 
                amb.id === updatedAmbulance.id ? updatedAmbulance : amb
              );
            } else {
              // Add new available ambulance that wasn't in list before
              return [...prev, updatedAmbulance];
            }
          } else {
            // Remove ambulance if status is not available
            return prev.filter(amb => amb.id !== updatedAmbulance.id);
          }
        });
      }
    });

    

    return () => {

      updateSubscription.unsubscribe();

    };
  }, []);

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className={`${geistSans.className} ${geistMono.className} font-sans min-h-screen`}>
          {/* Navigation Bar */}
          <nav className="bg-black shadow-2xl border-gray-200 rounded-[50px] mt-4 mx-2">
            <div className="w-full mx-auto px-6 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-20">
                {/* Logo/Brand */}
                <div className="flex items-center">
                  <Link href="/" className="flex justify-center items-center">
                    <Image
                      alt="ELDI Logo"
                      src="/e-logo.png"
                      width={50}
                      height={50}
                      className="rounded-full"
                    />
                    <h1 className="text-xl font-semibold text-white ml-2">
                      ELDI Dashboard
                    </h1>
                  </Link>
                </div>

                {/* Navigation Links */}
                <div className="hidden md:block">
                  <div className="ml-0 flex items-baseline space-x-7">
                    <Link
                      href="/"
                      className="text-white bg-sky-700 hover:bg-sky-800 trans px-6 py-4 rounded-[50px] text-sm font-medium"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/ambulances"
                      className="text-white bg-sky-700 hover:bg-sky-800 trans px-6 py-4 rounded-[50px] text-sm font-medium"
                    >
                      Ambulances
                    </Link>
                  </div>
                </div>

                {/* Sign Out Button */}
                <div className="flex items-center space-x-3">
            
                  <button
                    onClick={signOut}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 text-sm font-semibold transition-colors duration-200 ease-in-out focus:outline-none rounded-[50px]"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </nav>

          {/* Ambulances Content */}
          <div className="container mx-auto px-4 py-8">
            <h2 className="text-2xl text-white font-bold mb-6">Available Ambulances</h2>
            
            {loading ? (
              <div className="text-center">Loading ambulances...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ambulances.map((ambulance) => (
                  <div key={ambulance.id} className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold">{ambulance.id}</h3>
                    <p className="text-gray-600">Driver: {ambulance.name}</p>
                    <p className="text-gray-600">Status: {ambulance.status}</p>
                    <p className="text-gray-600">
                      Location:{" "}
                      {ambulance.location && ambulance.location.lat !== undefined && ambulance.location.long !== undefined
                        ? `Lat: ${ambulance.location.lat}, Long: ${ambulance.location.long}`
                        : "Unknown"}
                    </p>
                    {ambulance.updatedAt && (
                      <p className="text-sm text-gray-500">
                        Last updated: {new Date(ambulance.updatedAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Authenticator>
  );
}
