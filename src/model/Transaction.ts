export class Transaction {
    id: string;
    accountID: string;
    amount: number;
    categoryID: string;
    transactionName: string;
    transactionDate: string;
    createdAt: string;

    constructor(
        id: string,
        accountID: string,
        amount: number,
        categoryID: string,
        transactionName: string,
        transactionDate: string,
        createdAt: string
    ) {
        this.id = id;
        this.accountID = accountID;
        this.amount = amount;
        this.categoryID = categoryID;
        this.transactionName = transactionName;
        this.transactionDate = transactionDate;
        this.createdAt = createdAt;
    }
}