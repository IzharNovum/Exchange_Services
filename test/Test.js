let array = [2,3,-98238,3,23,-23,-4,-9];

let numbers = positiveNum(array, (y) => y>=0);

function positiveNum(list, callback){
    return new Promise((resolve, reject) =>{
        const myArray = []

        for(const y of list){
            if(callback(y)){
                myArray.push(y);
            }
        }

        if(myArray.length > 0){
            resolve(myArray);
        }else{
            reject("Whoops, no data found");
        }
    })
}

// Handling the Promise result
numbers
    .then((result) => {
        console.log("Filtered numbers:", result); // This will log the filtered numbers
    })
    .catch((error) => {
        console.error(error); // This will log the error message if no data is found
    });