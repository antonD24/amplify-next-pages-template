import Image from "next/image";
import Link from "next/link"; // Add this import
import { Inter, Roboto_Mono } from "next/font/google";
import { Authenticator } from '@aws-amplify/ui-react';
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import outputs from "../amplify_outputs.json";
import { signOut } from '@aws-amplify/auth';
import { generateClient } from "aws-amplify/data";
import { useState, useEffect } from "react";

import { data, type Schema } from "../amplify/data/resource";

const client = generateClient<Schema>();

Amplify.configure(outputs);

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [caseActive, setCaseActive] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingStateChange, setPendingStateChange] = useState<{ case: any, newState: 'CREATED' | 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETE' | 'REDIRECTED' } | null>(null);
  
  // Add new state for ambulance assignment
  const [showAmbulanceDialog, setShowAmbulanceDialog] = useState(false);
  const [availableAmbulances, setAvailableAmbulances] = useState<Array<Schema["Ambulance"]["type"]>>([]);
  const [loadingAmbulances, setLoadingAmbulances] = useState(false);

  // // Test function to create a new emergency (for testing real-time updates)
  // const createTestEmergency = async () => {
  //   try {
  //     console.log('Creating test emergency...');
  //     const testEmergency = await client.models.Emergency.create({
  //       natid: `TEST-${Date.now()}`,
  //       firstname: "Test",
  //       lastname: "User",
  //       dob: "1990-01-01",
  //       phone: "+447123456789", // Valid UK E.164 format
  //       ICEname: "Emergency Contact",
  //       ICEphone: "+447987654321", // Valid UK E.164 format
  //       relationshipstatus: "Single",
  //       content: `Test Emergency - ${new Date().toLocaleTimeString()}`,
  //       status: 'CREATED',
  //       location: {
  //         lat: 51.5074, // London coordinates
  //         long: -0.1278
  //       }
  //     });
  //     console.log('Test emergency created successfully:', testEmergency);
  //   } catch (err) {
  //     console.error('Error creating test emergency:', err);
  //   }
  // };

  useEffect(() => {
    setIsLoading(true);

    // Use observeQuery for real-time updates
    const subscription = client.models.Emergency.observeQuery().subscribe({
      next: ({ items, isSynced }) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] Subscription update:`, { itemsCount: items.length, isSynced });
        console.log(`[${timestamp}] Raw items:`, items);

        if (isSynced) {
          setIsLoading(false);
          console.log(`[${timestamp}] Data synchronized, found`, items.length, 'emergencies');
        }

        // Sort emergencies by updatedAt in descending order and filter based on status
        const sortedEmergencies = [...items]
          .filter(emergency => {
            // Only show cases that are CREATED or OPEN
            const activeStatuses = ['CREATED', 'OPEN'];
            const emergencyStatus = emergency.status || 'CREATED'; // Default to CREATED if no status
            return activeStatuses.includes(emergencyStatus);
          })
          .sort((a, b) => {
            const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return dateB - dateA;
          });

        console.log(`[${timestamp}] Setting emergencies state to:`, sortedEmergencies);
        console.log(`[${timestamp}] Current emergencies length:`, emergencies.length, '-> New length:', sortedEmergencies.length);

        setEmergencies(sortedEmergencies);
        setLastUpdate(new Date()); // Update timestamp
        setError(null); // Clear any previous errors
      },
      error: (error) => {
        console.error('Error observing emergencies:', error);
        setError(`Failed to fetch emergencies: ${error.message || 'Unknown error'}`);
        setIsLoading(false);
      }
    });

    // Cleanup subscription on component unmount
    return () => {
      console.log('Cleaning up Emergency subscription');
      subscription.unsubscribe();
    };
  }, []);

  //Open case in the right section
  const openCase = (emergency: any) => {
    setSelectedCase(emergency);
    console.log('Opening case:', emergency);
  };

  // Show confirmation dialog before changing status
  const requestStatusChange = (emergency: any, newStatus: 'CREATED' | 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETE' | 'REDIRECTED') => {
    setPendingStateChange({ case: emergency, newState: newStatus });
    setShowConfirmDialog(true);
  };

  // Confirm and execute the status change
  const confirmStatusChange = async () => {
    if (pendingStateChange) {
      setShowConfirmDialog(false);
      try {
        await changeStatus(pendingStateChange.case, pendingStateChange.newState);
      } catch (error) {
        console.error('Confirmed status change error:', error);
      } finally {
        setPendingStateChange(null);
      }
    }
  };

  // Cancel the status change
  const cancelStatusChange = () => {
    setShowConfirmDialog(false);
    setPendingStateChange(null);
  };

  //Update the status
  const changeStatus = async (emergency: any, newStatus: 'CREATED' | 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETE' | 'REDIRECTED') => {
    setIsUpdating(true);
    try {
      console.log('=== Starting changeStatus ===');
      console.log('Emergency object:', emergency);
      console.log('Emergency ID:', emergency.id);
      console.log('Current status:', emergency.status);
      console.log('New status:', newStatus);
      console.log('Emergency natid:', emergency.natid);

      // Log current user context
      try {
        const { getCurrentUser } = await import('@aws-amplify/auth');
        const currentUser = await getCurrentUser();
        console.log('Current authenticated user:', currentUser);
      } catch (authError) {
        console.error('Error getting current user:', authError);
      }

      if (!emergency.id) {
        throw new Error('Emergency ID is missing');
      }

      const updateData = {
        id: emergency.id,
        status: newStatus,
      };

      console.log('Update data being sent:', updateData);

      const updatedEmergency = await client.models.Emergency.update(updateData);

      console.log('Raw response from update:', updatedEmergency);
      console.log('Successfully updated emergency:', updatedEmergency.data);

      // Update the selected case if it's the one being modified
      if (selectedCase && selectedCase.id === emergency.id) {
        // Clear the selected case if status is REDIRECTED, ASSIGNED, or IN_PROGRESS (will be filtered out)
        if (newStatus === 'REDIRECTED' || newStatus === 'ASSIGNED' || newStatus === 'IN_PROGRESS') {
          console.log('Clearing selected case due to status change:', newStatus);
          setSelectedCase(null);
        } else {
          const newSelectedCase = {
            ...selectedCase,
            status: newStatus,
          };
          console.log('Updating selected case:', newSelectedCase);
          setSelectedCase(newSelectedCase);
        }
      }

      // Clear any existing errors
      setError(null);

      return updatedEmergency;
    } catch (error) {
      console.error('=== Error in changeStatus ===');
      console.error('Full error object:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to update case status: ${errorMessage}`);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Function to fetch available ambulances
  const fetchAvailableAmbulances = async () => {
    setLoadingAmbulances(true);
    try {
      const { data } = await client.models.Ambulance.list({
        filter: {
          status: { eq: "available" }
        }
      });
      setAvailableAmbulances(data);
    } catch (error) {
      console.error("Error fetching ambulances:", error);
      setError("Failed to fetch available ambulances");
    } finally {
      setLoadingAmbulances(false);
    }
  };

  // Function to open ambulance selection dialog
  const openAmbulanceDialog = () => {
    setShowAmbulanceDialog(true);
    fetchAvailableAmbulances();
  };

  // Function to assign ambulance to emergency
  const assignAmbulance = async (ambulanceId: string) => {
    if (!selectedCase) return;

    setIsUpdating(true);
    try {
      // Update emergency status to ASSIGNED and set ambulanceId
      const updatedEmergency = await client.models.Emergency.update({
        id: selectedCase.id,
        status: 'ASSIGNED',
        ambulanceId: ambulanceId // Use existing ambulanceId field
      });

      // Update ambulance status to busy
      await client.models.Ambulance.update({
        id: ambulanceId,
        status: 'busy'
      });

      // Update selected case
      if (updatedEmergency.data) {
        // Clear the selected case since it will be filtered out from the list
        console.log('Clearing selected case after ambulance assignment');
        setSelectedCase(null);
      }

      setShowAmbulanceDialog(false);
      console.log('Successfully assigned ambulance to emergency');
      
    } catch (error) {
      console.error('Error assigning ambulance:', error);
      setError('Failed to assign ambulance to emergency');
    } finally {
      setIsUpdating(false);
    }
  };

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
                  <Link href="/" className="flex items-center">
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
                <div className="flex-1 ml-[3%] hidden md:block">
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
                  {/* <button
                    onClick={createTestEmergency}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold transition-colors duration-200 ease-in-out focus:outline-none rounded-[25px]"
                  >
                    Test Real-Time
                  </button> */}
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

          {/* Main Content */}
          <main className="w-full mx-auto py-1 sm:px-4 lg:px-4 flex-1 h-full">
            <div className="px-4 py-6 sm:px-0 h-full">
              <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-[calc(100vh-200px)]">
                {/* Left Section */}
                <div className="flex flex-col w-full h-full sticky top-0">
                  {/* Fixed Header */}
                  <div className="w-full h-16 mx-auto px-6 flex items-center justify-between rounded-[50px] bg-white shadow-lg mb-4 sticky top-4 z-20">
                    <h2 className="text-xl font-semibold text-red-600">CASES</h2>
                    <div className="text-xs text-gray-500">
                      Last Update: {lastUpdate.toLocaleTimeString()}
                    </div>
                  </div>

                  {/* Scrollable Content Area */}
                  <div className="flex-1 overflow-y-auto w-full px-4 max-h-[calc(100vh-250px)]" key={`emergency-list-${lastUpdate.getTime()}`}>
                    <div className="space-y-3">
                      {isLoading ? (
                        <div className="text-center py-8">
                          <p className="text-gray-500">Loading cases...</p>
                        </div>
                      ) : error ? (
                        <div className="text-center py-8">
                          <p className="text-red-500">{error}</p>
                        </div>
                      ) : emergencies.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No cases found</p>
                        </div>
                      ) : (
                        emergencies.map((emergency, index) => (
                          <div
                            key={emergency.id || index}
                            className="bg-white rounded-[50px] w-full p-4 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                          >
                            <div className="flex justify-between w-full items-center">
                              <div>
                                <h3 className="font-semibold ml-4 text-gray-800">
                                  {emergency.firstname && emergency.lastname
                                    ? `${emergency.firstname} ${emergency.lastname}`
                                    : `Case #${(index + 1).toString().padStart(3, '0')}`}
                                </h3>
                                <p className="text-sm ml-4 py-1 text-gray-600">{emergency.content || 'Emergency Alert'}</p>
                                {emergency.natid && (
                                  <p className="text-xs ml-4 py-1 text-gray-500">ID: {emergency.natid}</p>
                                )}
                                {emergency.phone && (
                                  <p className="text-xs ml-4 py-1 text-gray-500">Phone: {emergency.phone}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="flex flex-col items-end space-y-2">
                                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${emergency.status === 'CREATED' ? 'bg-yellow-100 text-yellow-800' :
                                      emergency.status === 'OPEN' ? 'bg-red-100 text-red-800' :
                                        emergency.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' :
                                          emergency.status === 'IN_PROGRESS' ? 'bg-orange-100 text-orange-800' :
                                            emergency.status === 'COMPLETE' ? 'bg-green-100 text-green-800' :
                                              emergency.status === 'REDIRECTED' ? 'bg-purple-100 text-purple-800' :
                                                'bg-gray-100 text-gray-600'
                                    }`}>
                                    {emergency.status || 'Unknown'}
                                  </span>
                                  <p className="text-xs text-gray-500">
                                    {emergency.updatedAt ? new Date(emergency.updatedAt).toLocaleString() : 'Recently'}
                                  </p>
                                  {emergency.location && emergency.location.lat && emergency.location.long && (
                                    <p className="text-xs text-blue-500">
                                      📍 Location Available
                                    </p>
                                  )}
                                </div>
                                {/* <button onClick={() => openCase(emergency)} className="mt-4 inline-flex items-center px-6 py-3 bg-red-600 text-white text-xs font-semibold rounded-full hover:bg-sky-900 transition-colors duration-200">
                                  Open Case
                                </button> */}
                                <button
                                  onClick={() => {
                                    openCase(emergency);
                                    if (emergency.status !== 'OPEN') {
                                      changeStatus(emergency, 'OPEN');
                                    }
                                  }}
                                  disabled={isUpdating || emergency.status === 'OPEN'}
                                  className={`mt-4 inline-flex items-center px-6 py-3 bg-red-600 text-white text-xs font-semibold rounded-full hover:bg-sky-900 transition-colors duration-200 ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  {isUpdating ? 'Updating...' : 'Open Case'}
                                </button>
                              </div>
                            </div>


                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Vertical Separator Line */}
                <div className="hidden lg:block absolute left-1/2 py-100 top-0 bottom-0 w-1 h-full rounded-full bg-gray-400 opacity-25 transform -translate-x-1/2 z-10"></div>

                {/* Right Section */}
                <div className="flex flex-col w-full h-full sticky top-0">
                  {/* Fixed Header */}
                  <div className="w-full h-16 mx-auto px-6 flex items-center justify-between rounded-[50px] bg-white shadow-lg mb-4 sticky top-4 z-20">
                    <h2 className="text-xl font-semibold text-red-500">Case View</h2>
                    <div className="text-base text-gray-700">
                      {isLoading ? (
                        "Loading cases..."
                      ) : error ? (
                        error
                      ) : (
                        `${emergencies.length} cases available`
                      )}
                    </div>
                  </div>

                  {/* Scrollable Content Area */}
                  <div className="flex-1 overflow-y-auto w-full px-4 max-h-[calc(100vh-250px)]">
                    {selectedCase ? (
                      <div className="bg-white rounded-[50px] w-full p-6 shadow-lg">
                        {/* Case Header */}
                        <div className="mb-6">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xl font-bold text-gray-800">
                              {selectedCase.firstname} {selectedCase.lastname}
                            </h3>
                            <span className={`inline-block px-4 py-2 text-sm font-medium rounded-full ${selectedCase.status === 'CREATED' ? 'bg-yellow-100 text-yellow-800' :
                                selectedCase.status === 'OPEN' ? 'bg-red-100 text-red-800' :
                                  selectedCase.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' :
                                    selectedCase.status === 'IN_PROGRESS' ? 'bg-orange-100 text-orange-800' :
                                      selectedCase.status === 'COMPLETE' ? 'bg-green-100 text-green-800' :
                                        selectedCase.status === 'REDIRECTED' ? 'bg-purple-100 text-purple-800' :
                                          'bg-gray-100 text-gray-600'
                              }`}>
                              {selectedCase.status || 'Unknown Status'}
                            </span>
                          </div>
                          <p className="text-gray-700 text-base">Message: {selectedCase.content}</p>
                        </div>

                        {/* Personal Information Section */}
                        <div className="mb-6">
                          <h4 className="text-lg font-semibold mb-4 text-gray-800">Personal Information</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-600">Name:</span>
                              <span className="text-sm text-gray-800 bg-gray-50 px-3 py-1 rounded-full">
                                {selectedCase.firstname} {selectedCase.lastname}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-600">National ID:</span>
                              <span className="text-sm text-gray-800 bg-gray-50 px-3 py-1 rounded-full">{selectedCase.natid}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-600">Date of Birth:</span>
                              <span className="text-sm text-gray-800 bg-gray-50 px-3 py-1 rounded-full">{selectedCase.dob}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-600">Phone:</span>
                              <span className="text-sm text-gray-800 bg-gray-50 px-3 py-1 rounded-full">{selectedCase.phone}</span>
                            </div>
                            {selectedCase.email && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-600">Email:</span>
                                <span className="text-sm text-gray-800 bg-gray-50 px-3 py-1 rounded-full">{selectedCase.email}</span>
                              </div>
                            )}
                            {selectedCase.homeaddress && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-600">Home Address:</span>
                                <span className="text-sm text-gray-800 bg-gray-50 px-3 py-1 rounded-full">{selectedCase.homeaddress}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Emergency Contact Section */}
                        {selectedCase.ICEname && (
                          <div className="mb-6">
                            <h4 className="text-lg font-semibold mb-4 text-gray-800">Emergency Contact</h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-600">Contact Name:</span>
                                <span className="text-sm text-gray-800 bg-red-50 px-3 py-1 rounded-full">{selectedCase.ICEname}</span>
                              </div>
                              {selectedCase.relationshipstatus && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-600">Relationship:</span>
                                  <span className="text-sm text-gray-800 bg-red-50 px-3 py-1 rounded-full">{selectedCase.relationshipstatus}</span>
                                </div>
                              )}
                              {selectedCase.ICEphone && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-600">Contact Phone:</span>
                                  <span className="text-sm text-gray-800 bg-red-50 px-3 py-1 rounded-full">{selectedCase.ICEphone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Location Section */}
                        {selectedCase.location && selectedCase.location.lat && selectedCase.location.long && (
                          <div className="mb-6">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="text-lg font-semibold text-gray-800">Location</h4>

                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-600">Latitude:</span>
                                <span className="text-sm text-gray-800 bg-blue-50 px-3 py-1 rounded-full">{selectedCase.location.lat}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-600">Longitude:</span>
                                <span className="text-sm text-gray-800 bg-blue-50 px-3 py-1 rounded-full">{selectedCase.location.long}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-center gap-14 flex-wrap">

                          <button
                            onClick={() => requestStatusChange(selectedCase, 'REDIRECTED')}
                            disabled={isUpdating || selectedCase.status === 'REDIRECTED'}
                            className={`w-[35%] px-4 py-4 text-white text-xs font-semibold rounded-full transition-colors duration-200 ${selectedCase.status === 'REDIRECTED'
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-sky-700 hover:bg-sky-600'
                              } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {isUpdating ? 'Updating...' : 'Redirect Case'}
                          </button>
                          <button 
                            onClick={openAmbulanceDialog}
                            disabled={!selectedCase || selectedCase.status === 'ASSIGNED'}
                            className={`w-[35%] px-4 py-4 text-white text-xs font-semibold rounded-full transition-colors duration-200 ${
                              !selectedCase || selectedCase.status === 'ASSIGNED'
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-500 to-red-600 hover:scale-105 transition-transform duration-200 ease-in-out'
                            }`}
                          >
                            {selectedCase?.status === 'ASSIGNED' ? 'Already Assigned' : 'Send to Ambulance'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 items-center justify-center min-h-[200px]">
                        <p className="text-center py-8 text-gray-500">Select a case to view details.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* Confirmation Dialog */}
          {showConfirmDialog && pendingStateChange && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-[30px] p-8 max-w-md mx-4 shadow-xl">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    Confirm Status Change
                  </h3>
                  <p className="text-gray-600 mb-2">
                    Are you sure you want to change the status of this case?
                  </p>
                  <p className="text-sm text-gray-500 mb-2">
                    <strong>{pendingStateChange.case.firstname} {pendingStateChange.case.lastname}</strong>
                    <br />
                    ID: {pendingStateChange.case.natid}
                    <br />
                    Current Status: <span className="font-semibold">{pendingStateChange.case.status}</span>
                    <br />
                    New Status: <span className="font-semibold">{pendingStateChange.newState}</span>
                  </p>

                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={cancelStatusChange}
                      className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white text-sm font-semibold rounded-full transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmStatusChange}
                      disabled={isUpdating}
                      className={`px-6 py-3 text-white text-sm font-semibold rounded-full transition-colors duration-200 ${pendingStateChange.newState === 'COMPLETE'
                          ? 'bg-green-500 hover:bg-green-600'
                          : pendingStateChange.newState === 'IN_PROGRESS'
                            ? 'bg-orange-500 hover:bg-orange-600'
                            : 'bg-blue-500 hover:bg-blue-600'
                        } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isUpdating ? 'Processing...' : `Confirm Status Change`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ambulance Selection Dialog */}
          {showAmbulanceDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-[30px] p-8 max-w-2xl mx-4 shadow-xl max-h-[80vh] overflow-y-auto">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Assign Ambulance
                  </h3>
                  <p className="text-gray-600">
                    Select an available ambulance for: <strong>{selectedCase?.firstname} {selectedCase?.lastname}</strong>
                  </p>
                </div>

                {loadingAmbulances ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading available ambulances...</p>
                  </div>
                ) : availableAmbulances.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No ambulances currently available</p>
                  </div>
                ) : (
                  <div className="space-y-4 mb-6">
                    {availableAmbulances.map((ambulance) => (
                      <div 
                        key={ambulance.id} 
                        className="border rounded-[20px] p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold text-gray-800">
                              Ambulance {ambulance.id}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Driver: {ambulance.name || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-600">
                              Status: {ambulance.status}
                            </p>
                            {ambulance.location && (
                              <p className="text-xs text-gray-500">
                                Location: Lat {ambulance.location.lat}, Long {ambulance.location.long}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => assignAmbulance(ambulance.id)}
                            disabled={isUpdating}
                            className={`px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-full transition-colors duration-200 ${
                              isUpdating ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {isUpdating ? 'Assigning...' : 'Assign'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setShowAmbulanceDialog(false)}
                    className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white text-sm font-semibold rounded-full transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={fetchAvailableAmbulances}
                    disabled={loadingAmbulances}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-full transition-colors duration-200"
                  >
                    Refresh List
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Authenticator>
  );
}
