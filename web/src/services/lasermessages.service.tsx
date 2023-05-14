import http from "../http-common";
import ILaserMessage from "../types/LaserMessage.type"

class LaserMessagesService {
    getAll() {
        return http.get<Array<ILaserMessage>>("/api/messages");
    }

    update(data: ILaserMessage, id: any) {
        return http.put<any>(`/api/messages/${id}`, data);
    }

}

export default new LaserMessagesService();