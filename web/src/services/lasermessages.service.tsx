import http from "../http-common";
import ILaserMessage from "../types/LaserMessage.type"

class LaserMessagesService {
  getAll() {
    return http.get<Array<ILaserMessage>>("/api/messages");
  }

  get(id: string) {
    return http.get<ILaserMessage>(`/messages/${id}`);
  }

  create(data: ILaserMessage) {
    return http.post<ILaserMessage>("/messages", data);
  }

  update(data: ILaserMessage, id: any) {
    return http.put<any>(`/ILaserMessage/${id}`, data);
  }

  delete(id: any) {
    return http.delete<any>(`/messages/${id}`);
  }

}

export default new LaserMessagesService();