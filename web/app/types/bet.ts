export interface BetOption {
  id: string
  label: string
  odds: number
}

export interface BetProposal {
  id: string
  type: 'BET_PROPOSAL'
  question: string
  options: BetOption[]
  durationSec: number
  category: 'goal' | 'card' | 'corner' | 'result' | 'misc'
}

export interface BetResult {
  id: string
  type: 'BET_RESULT'
  winningOptionId: string
  question: string
}

export interface PlacedBet {
  betId: string
  question: string
  selectedOptionId: string
  selectedLabel: string
  odds: number
  wager: number
  result?: 'win' | 'loss' | 'pending'
  payout?: number
}

export type BetMessage = BetProposal | BetResult
