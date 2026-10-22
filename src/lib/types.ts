import type { Database } from './database.types'

type PublicEnums = Database['public']['Enums']
type PublicTables = Database['public']['Tables']

export type BoardBasis = PublicEnums['board_basis']
export type RoomSetup = PublicEnums['room_setup']
export type VacationStyle = PublicEnums['vacation_style']
export type RequestStatus = PublicEnums['request_status']
export type BookingStatus = PublicEnums['booking_status']

export type QuoteRequest = PublicTables['quote_requests']['Row']
export type QuoteRequestInsert = PublicTables['quote_requests']['Insert']
export type Booking = PublicTables['bookings']['Row']
export type Offer = PublicTables['offers']['Row']
export type Profile = PublicTables['profiles']['Row']
