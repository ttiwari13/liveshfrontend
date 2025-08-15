import { Search } from "lucide-react";

export default function SearchBar(){
    return (
       <>
         <div className="bg-dark flex items-center  border border-primary rounded-full px- py-2 shadow-sm w-1/2 ml-10">
             <Search className="w-6 h-6  text-primary"/>
            <input 
               type="text"
               placeholder="Search..."
               className="ml-1 outline-none bg-transparent w-full text-white"/>
         </div>
       </>
    );
}